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

/**
 * 결과 입력 대기 로테이션 — 내 세션 + 지정한 방(내가 joined인 방)의 세션을 `.or()` 한 번으로.
 * 방 멤버십을 이미 읽은 호출자(fetchMatchQueue)가 room id를 넘겨 중복 조회를 없앤다.
 * RLS(rotation_sessions_select, 0050)가 같은 조건을 서버에서 다시 강제한다.
 */
export async function fetchQueueRotationSessions(userId: string, joinedRoomIds: string[]): Promise<RotationSession[]> {
    const supabase = await createClient()
    const query = rotationSelect(supabase)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
    const { data, error } = await (joinedRoomIds.length === 0
        ? query.eq('user_id', userId)
        : query.or(`user_id.eq.${userId},room_id.in.(${joinedRoomIds.join(',')})`))
    if (error || !data) return []
    return data.map(mapRotationSessionRow)
}
