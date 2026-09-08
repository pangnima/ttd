import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type {
    CourtSurface, MatchRequest, MatchRequestSeat, MatchRequestStatus, MatchResultStatus,
    MatchType, PersonalMatchSetScore,
} from '@/types'

type MatchRequestRow = Database['public']['Tables']['match_requests']['Row']
type NegotiationRow = Database['public']['Tables']['match_result_negotiations']['Row']
type RequestParticipantRow = Database['public']['Tables']['match_request_participants']['Row']
type MatchRequestRowWithJoins = MatchRequestRow & {
    negotiation: NegotiationRow | null
    participants: RequestParticipantRow[]
    requester: CounterpartRow
    opponent: CounterpartRow
}

// 요청 카드에 표시할 상대측(요청자 또는 수신자) 프로필 요약
export type MatchRequestCounterpart = {
    id: string
    name: string
    nickname: string
    profileImage?: string
    deleted: boolean
}

export type MatchRequestWithUser = {
    request: MatchRequest
    counterpart: MatchRequestCounterpart  // 받은 요청이면 요청자, 보낸 요청이면 상대
}

/**
 * 요청 행 + 참가자 행 → 좌석 배열(0056). 요청자·대표는 참가자 테이블에 행이 없으므로
 * requester_id / opponent_user_id + opponent_accepted_at에서 만든다.
 * 요청자는 만든 사람이라 동의가 자명하고, 비회원 좌석은 수락 대상이 아니다.
 */
function buildSeats(row: MatchRequestRowWithJoins): MatchRequestSeat[] {
    const seats: MatchRequestSeat[] = [
        { role: 'requester', userId: row.requester_id, name: row.requester?.name ?? '', acceptance: 'accepted' },
        {
            role: 'opponent',
            userId: row.opponent_user_id,
            name: row.opponent?.name ?? '',
            acceptance: row.status === 'rejected' ? 'rejected'
                : row.opponent_accepted_at || row.status === 'accepted' ? 'accepted' : 'pending',
        },
    ]
    for (const role of ['partner', 'opponent2'] as const) {
        const p = row.participants?.find((x) => x.role === role)
        if (!p) continue
        seats.push({
            role,
            userId: p.user_id ?? undefined,
            name: p.name,
            acceptance: (p.participation_status as MatchRequestSeat['acceptance']) ?? 'accepted',
        })
    }
    return seats
}

function mapMatchRequestRow(row: MatchRequestRowWithJoins, viewerId: string): MatchRequest {
    const neg = row.negotiation
    const partner = row.participants?.find((p) => p.role === 'partner')
    const opponent2 = row.participants?.find((p) => p.role === 'opponent2')
    const seats = buildSeats(row)
    return {
        seats,
        viewerRole: seats.find((s) => s.userId === viewerId)?.role,
        rotationSessionId: row.rotation_session_id ?? undefined,
        groupSeq: row.group_seq ?? undefined,
        id: row.id,
        requesterId: row.requester_id,
        opponentUserId: row.opponent_user_id,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time.slice(0, 5),
        matchType: row.match_type as MatchType,
        surface: row.surface as CourtSurface,
        setScores: (row.set_scores as PersonalMatchSetScore[]) ?? [],
        notes: row.notes ?? undefined,
        courtName: row.court_name ?? undefined,
        status: row.status as MatchRequestStatus,
        roomId: row.room_id ?? undefined,
        createdAt: row.created_at,
        respondedAt: row.responded_at ?? undefined,
        resultStatus: (neg?.result_status as MatchResultStatus) ?? 'none',
        proposedSetScores: (neg?.proposed_set_scores as PersonalMatchSetScore[]) ?? [],
        proposedBy: neg?.proposed_by ?? undefined,
        proposedAt: neg?.proposed_at ?? undefined,
        disputeReason: neg?.dispute_reason ?? undefined,
        // 복식 전용 (단식은 참가자 행 없음)
        partnerUserId: partner?.user_id ?? undefined,
        partnerName: partner?.name ?? undefined,
        partnerDominantHand: toHand(partner?.dominant_hand ?? null),
        partnerNtrp: partner?.ntrp_snapshot != null ? Number(partner.ntrp_snapshot) : undefined,
        opponent2UserId: opponent2?.user_id ?? undefined,
        opponent2Name: opponent2?.name ?? undefined,
        opponent2DominantHand: toHand(opponent2?.dominant_hand ?? null),
        opponent2Ntrp: opponent2?.ntrp_snapshot != null ? Number(opponent2.ntrp_snapshot) : undefined,
    }
}

function toHand(v: string | null): 'right' | 'left' | undefined {
    return v === 'right' || v === 'left' ? v : undefined
}

type CounterpartRow = {
    id: string
    name: string
    nickname: string
    profile_image: string | null
    deleted_at: string | null
} | null

function mapCounterpart(row: CounterpartRow): MatchRequestCounterpart {
    return {
        id: row?.id ?? '',
        name: row?.name ?? '(알 수 없음)',
        nickname: row?.nickname ?? '',
        profileImage: row?.profile_image ?? undefined,
        deleted: !!row?.deleted_at,
    }
}

const COUNTERPART_COLUMNS = 'id, name, nickname, profile_image, deleted_at'
// 결과 협상(match_result_negotiations, 1:1)·참가자(match_request_participants, 복식 partner/opponent2) 공용 임베드.
const REQUEST_JOINS = 'negotiation:match_result_negotiations(*), participants:match_request_participants(*)'

/**
 * 내가 당사자인 확인 요청 전량(요청자·대표 확인자 양방향) 1회 조회 — 확인 요청 허브의 A축.
 * 받은/보낸/종료를 세 쿼리로 나누던 구 경로(fetchReceived·fetchSent·fetchPendingResultConfirmations)를
 * 대체한다. 상태 필터를 걸지 않는 이유: 허브가 pending(참여 확인)·rejected/canceled(이력)를 한 화면에서
 * 나눠 보여주고, accepted는 personal_matches 쪽(B축)이 담당하므로 분류는 조립 계층이 한다.
 * 양쪽 users를 임베드한 뒤 viewer 기준으로 counterpart를 고른다(최신순).
 */
export async function fetchMyMatchRequests(userId: string): Promise<MatchRequestWithUser[]> {
    const supabase = await createClient()
    const seatedIds = await fetchSeatedRequestIds(userId, supabase)
    const filters = [`requester_id.eq.${userId}`, `opponent_user_id.eq.${userId}`]
    // 빈 배열이면 `id.in.()`가 422를 내고 목록 전체가 빈 배열로 폴백된다 — 조건부로만 붙인다
    if (seatedIds.length > 0) filters.push(`id.in.(${seatedIds.join(',')})`)

    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, requester:users!match_requests_requester_id_fkey(${COUNTERPART_COLUMNS}), opponent:users!match_requests_opponent_user_id_fkey(${COUNTERPART_COLUMNS}), ${REQUEST_JOINS}`)
        // accepted는 personal_matches 행(B축)이 대신 표현한다. 방 로테이션이 게임마다 accepted 요청을
        // 1행씩 남기므로(0050) 필터가 없으면 순수 잡음을 수십~수백 행 읽는다.
        .neq('status', 'accepted')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => ({
        request: mapMatchRequestRow(row, userId),
        counterpart: mapCounterpart(row.requester_id === userId ? row.opponent : row.requester),
    }))
}

// uuid 36자 × N이 URL 길이 상한에 닿는다 — 넘치면 최신순으로 자른다
const SEATED_REQUEST_LIMIT = 200

/**
 * 내가 파트너·상대2 좌석에 앉은 요청 id(0056). RLS(0052 is_request_party)는 이미 열려 있고,
 * 좁히던 것은 애플리케이션 필터였다. 임베드 필터(`!inner` + eq)를 쓰면 참가자 배열 자체가
 * 걸러져 나머지 좌석이 사라지므로, id만 먼저 뽑아 본 쿼리의 or에 얹는다.
 */
async function fetchSeatedRequestIds(
    userId: string, supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
    const { data, error } = await supabase
        .from('match_request_participants')
        .select('request_id, request:match_requests!inner(status)')
        .eq('user_id', userId)
        .neq('request.status', 'accepted')
        .limit(SEATED_REQUEST_LIMIT)
    if (error || !data) return []
    return [...new Set(data.map((r) => r.request_id))]
}

/**
 * 요청 1건 — 취소한 요청을 등록 폼 초안으로 되살릴 때(Week 38, request-prefill.ts).
 * **요청자 본인 + canceled**만 돌려준다. pending을 허용하면 새 요청이 0056의 pending 중복 유니크에 걸리고,
 * 남의 요청은 RLS가 이미 막지만 앱 게이트도 같은 문장으로 둔다. 조건에 안 맞으면 null(호출부는 빈 폼).
 */
export async function fetchMatchRequestById(id: string, viewerId: string): Promise<MatchRequestWithUser | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select(`*, requester:users!match_requests_requester_id_fkey(${COUNTERPART_COLUMNS}), opponent:users!match_requests_opponent_user_id_fkey(${COUNTERPART_COLUMNS}), ${REQUEST_JOINS}`)
        .eq('id', id)
        .eq('requester_id', viewerId)
        .eq('status', 'canceled')
        .maybeSingle()
    if (error || !data) return null
    return { request: mapMatchRequestRow(data, viewerId), counterpart: mapCounterpart(data.opponent) }
}
