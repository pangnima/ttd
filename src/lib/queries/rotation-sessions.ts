import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type {
    CourtSurface, MatchType, RotationPoolPlayer, RotationSeatStatus, RotationSession, RotationSessionSeat,
} from '@/types'

type RotationSessionRow = Database['public']['Tables']['rotation_sessions']['Row']
type SeatRow = Database['public']['Tables']['rotation_session_participants']['Row']
type UserRow = { id: string; name: string; dominant_hand: string | null; ntrp: number | null; personal_ntrp: number | null }

/** 좌석 임베드는 배열, 소유자 임베드는 단일 객체로 온다(FK 방향 차이) */
type RotationSessionRowWithJoins = RotationSessionRow & {
    participants?: Array<SeatRow & { user?: UserRow | UserRow[] | null }> | null
    owner?: UserRow | UserRow[] | null
}

function isPoolPlayer(v: unknown): v is RotationPoolPlayer {
    return typeof v === 'object' && v !== null && typeof (v as { name?: unknown }).name === 'string'
}

function first<T>(v: T | T[] | null | undefined): T | undefined {
    return Array.isArray(v) ? v[0] : v ?? undefined
}

/**
 * 좌석 → 표시용 선수. 좌석 테이블에는 스냅샷 컬럼이 없으므로(0057) users 조인에서 채운다.
 * **명부(players)에서 찾으면 안 된다** — 거절자는 풀에서 빠져 이름을 잃는다(0058).
 */
function seatPlayer(user: UserRow | undefined, userId: string) {
    const ntrp = user ? user.personal_ntrp ?? user.ntrp : null
    return {
        name: user?.name ?? '참가자',
        hand: (user?.dominant_hand as 'right' | 'left' | null) ?? undefined,
        ntrp: ntrp ?? undefined,
        userId,
    }
}

export function mapRotationSessionRow(row: RotationSessionRowWithJoins, viewerId?: string): RotationSession {
    const raw = Array.isArray(row.players) ? row.players : []
    const players = raw.filter(isPoolPlayer)
    const seats: RotationSessionSeat[] = (row.participants ?? []).map((p) => {
        const player = seatPlayer(first(p.user), p.user_id)
        return {
            userId: p.user_id,
            name: player.name,
            acceptance: p.participation_status as RotationSeatStatus,
            ...(player.hand ? { hand: player.hand } : {}),
            ...(player.ntrp != null ? { ntrp: player.ntrp } : {}),
        }
    })
    const ownerRow = first(row.owner)
    return {
        id: row.id,
        userId: row.user_id,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time.slice(0, 5),
        matchType: row.match_type as MatchType,
        surface: row.surface as CourtSurface,
        notes: row.notes ?? undefined,
        courtName: row.court_name ?? undefined,
        players,
        createdAt: row.created_at,
        roomId: row.room_id ?? undefined,
        seats,
        viewerParticipation: viewerId ? seats.find((s) => s.userId === viewerId)?.acceptance : undefined,
        owner: ownerRow
            ? {
                userId: ownerRow.id,
                name: ownerRow.name,
                ...(ownerRow.dominant_hand ? { hand: ownerRow.dominant_hand as 'right' | 'left' } : {}),
                ...((ownerRow.personal_ntrp ?? ownerRow.ntrp) != null
                    ? { ntrp: (ownerRow.personal_ntrp ?? ownerRow.ntrp) as number }
                    : {}),
            }
            : undefined,
    }
}

// 좌석은 !inner를 걸면 안 된다 — 필터가 배열 자체를 걸러 진행도(0/2 등)가 망가진다.
// 좌석에 users를 붙이는 이유: 거절자는 players에서 빠져 명부로는 이름을 알 수 없다(0058).
// ⚠ supabase-js는 select 문자열을 **리터럴 타입**으로 파싱한다 — 상수 결합(`a + b`)이나
//   보간을 쓰면 타입이 string으로 뭉개져 결과가 GenericStringError가 된다. 한 줄로 둔다.
const ROTATION_JOINS = '*, participants:rotation_session_participants(*, user:users!rotation_session_participants_user_id_fkey(id, name, dominant_hand, ntrp, personal_ntrp)), owner:users!rotation_sessions_user_id_fkey(id, name, dominant_hand, ntrp, personal_ntrp)'

function rotationSelect(supabase: Awaited<ReturnType<typeof createClient>>) {
    return supabase.from('rotation_sessions').select(ROTATION_JOINS)
}

/** 좌석 세션 id 상한 — uuid 36자 × N이 .or() URL 길이에 닿는다 (SEATED_REQUEST_LIMIT 선례) */
const SEATED_SESSION_LIMIT = 200

/**
 * 내가 좌석에 앉은 세션 id. 임베드 필터로는 좌석 배열 자체가 걸러지므로 id를 먼저 뽑아
 * `.or()`에 얹는다 — fetchSeatedRequestIds(match-requests.ts)와 같은 패턴이다.
 * 거절했거나 주최자가 제외한 세션은 큐에서 완전히 뺀다(내 일정이 아니다).
 */
async function fetchSeatedSessionIds(
    userId: string,
    supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
    const { data } = await supabase
        .from('rotation_session_participants')
        .select('session_id')
        .eq('user_id', userId)
        .in('participation_status', ['pending', 'accepted'])
        .limit(SEATED_SESSION_LIMIT)
    return [...new Set((data ?? []).map((r) => r.session_id))]
}

/**
 * 결과 입력 대기 로테이션 — 내 세션 ∪ 내가 joined인 방의 세션 ∪ 내가 좌석에 앉은 세션(0057).
 * 방 멤버십을 이미 읽은 호출자(fetchMatchQueue)가 room id를 넘겨 중복 조회를 없앤다.
 * RLS(rotation_sessions_select → is_rotation_session_party, 0057)가 같은 조건을 서버에서 다시 강제한다.
 */
export async function fetchQueueRotationSessions(userId: string, joinedRoomIds: string[]): Promise<RotationSession[]> {
    const supabase = await createClient()
    const seatedIds = await fetchSeatedSessionIds(userId, supabase)

    // 빈 in.()은 422를 내므로 값이 있을 때만 술어를 넣는다
    const filters = [`user_id.eq.${userId}`]
    if (joinedRoomIds.length > 0) filters.push(`room_id.in.(${joinedRoomIds.join(',')})`)
    if (seatedIds.length > 0) filters.push(`id.in.(${seatedIds.join(',')})`)

    const { data, error } = await rotationSelect(supabase)
        .or(filters.join(','))
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => mapRotationSessionRow(row, userId))
}

/**
 * 방의 미확정 로테이션 세션 1건 — RLS가 방 참가자에게만 허용한다(0050).
 * 0050 이후 방 세션은 finalize 후에도 남고(참가자 여러 명이 각자 입력한다),
 * 방장의 close_rotation_room이 지운다 — 즉 행이 있으면 아직 입력을 받는 중이다.
 */
export async function fetchRoomRotationSession(roomId: string, viewerId?: string): Promise<RotationSession | null> {
    const supabase = await createClient()
    const { data, error } = await rotationSelect(supabase)
        .eq('room_id', roomId)
        .maybeSingle()
    if (error || !data) return null
    return mapRotationSessionRow(data, viewerId)
}
