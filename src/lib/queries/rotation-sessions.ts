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
        players: raw.filter(isPoolPlayer),
        createdAt: row.created_at,
    }
}

/** 내 로테이션 세션(결과 입력 대기) — 최신 경기일순. finalize되면 사라진다. */
export async function fetchRotationSessionsByUser(userId: string): Promise<RotationSession[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('rotation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapRotationSessionRow)
}
