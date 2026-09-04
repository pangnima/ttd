import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { CourtSurface, MatchType, RotationPoolPlayer, RotationSession } from '@/types'

type RotationSessionRow = Database['public']['Tables']['rotation_sessions']['Row']

function isPoolPlayer(v: unknown): v is RotationPoolPlayer {
    return typeof v === 'object' && v !== null && typeof (v as { name?: unknown }).name === 'string'
}

export function mapRotationSessionRow(row: RotationSessionRow): RotationSession {
    const raw = Array.isArray(row.players) ? row.players : []
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
        players: raw.filter(isPoolPlayer),
        createdAt: row.created_at,
        roomId: row.room_id ?? undefined,
    }
}

function rotationSelect(supabase: Awaited<ReturnType<typeof createClient>>) {
    return supabase.from('rotation_sessions').select('*')
}

/** 내가 만든 로테이션 세션(결과 입력 대기) — 최신 경기일순. finalize되면 사라진다. */
export async function fetchRotationSessionsByUser(userId: string): Promise<RotationSession[]> {
    const supabase = await createClient()
    const { data, error } = await rotationSelect(supabase)
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapRotationSessionRow)
}

/**
 * 결과 입력 대기 로테이션 — 내가 만든 세션 + **내가 참가(joined)한 방의 세션**(0050).
 * 방에 입장한 회원 누구나 게임을 입력할 수 있으므로 카드도 참가자 전원에게 보여야 한다.
 * `.or()`로는 "내가 joined인 방"을 표현할 수 없고, 무필터 select는 전 행마다 is_room_participant를
 * 평가하므로 방 id를 먼저 모아 `.in()`으로 좁힌다(RLS는 같은 조건을 서버에서 다시 강제한다).
 */
export async function fetchPendingRotationSessions(userId: string): Promise<RotationSession[]> {
    const supabase = await createClient()
    const { data: memberships } = await supabase
        .from('match_room_members')
        .select('room_id')
        .eq('user_id', userId)
        .eq('status', 'joined')

    const roomIds = [...new Set((memberships ?? []).map((m) => m.room_id))]
    const [mine, roomSessions] = await Promise.all([
        fetchRotationSessionsByUser(userId),
        roomIds.length === 0
            ? Promise.resolve([] as RotationSession[])
            : rotationSelect(supabase)
                .in('room_id', roomIds)
                .then(({ data, error }) => (error || !data ? [] : data.map(mapRotationSessionRow))),
    ])

    const byId = new Map(mine.map((s) => [s.id, s]))
    for (const s of roomSessions) if (!byId.has(s.id)) byId.set(s.id, s)
    return [...byId.values()].sort(
        (a, b) => b.playedAt.localeCompare(a.playedAt) || b.createdAt.localeCompare(a.createdAt),
    )
}
