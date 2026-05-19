import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PlayerStats, HeadToHead } from '@/lib/stats'

// get_user_match_stats RPC의 반환 구조.
// 단식/복식을 분리 집계하여 반환 (DB view: user_match_participations).
type RawStats = {
    matches: number
    wins: number
    losses: number
    draws: number
}

type RawMatchStats = {
    singles: RawStats
    doubles: RawStats
}

// RPC 원시 통계 → PlayerStats 변환.
// decisive = wins + losses (무승부 제외 분모): 승률은 무승부를 포함하지 않는 백분율.
// setsWon/setsLost/byMatchType은 RPC가 반환하지 않아 0/[] 로 채움 (타입 호환 목적).
function makePlayerStats(raw: RawStats): PlayerStats {
    const decisive = raw.wins + raw.losses
    return {
        wins: raw.wins,
        losses: raw.losses,
        draws: raw.draws ?? 0,
        totalMatches: decisive + (raw.draws ?? 0),
        winRate: decisive === 0 ? 0 : Math.round((raw.wins / decisive) * 100),
        setsWon: 0,
        setsLost: 0,
        byMatchType: [],
    }
}

// Supabase RPC `get_user_match_stats`: 단식/복식 누적 통계 조회.
// 반환 구조: { singles: RawStats, doubles: RawStats }
export async function fetchUserMatchStats(
    userId: string
): Promise<{ singles: PlayerStats; doubles: PlayerStats }> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_match_stats', { p_user_id: userId })
    if (error || !data) {
        const empty = makePlayerStats({ matches: 0, wins: 0, losses: 0, draws: 0 })
        return { singles: empty, doubles: empty }
    }
    const raw = data as RawMatchStats
    return {
        singles: makePlayerStats(raw.singles ?? { matches: 0, wins: 0, losses: 0, draws: 0 }),
        doubles: makePlayerStats(raw.doubles ?? { matches: 0, wins: 0, losses: 0, draws: 0 }),
    }
}

// Supabase RPC `get_user_head_to_head`: 상대 선수별 누적 전적 조회.
// 단식/복식 구분 없이 opponent_id 기준으로 집계됨.
export async function fetchUserHeadToHead(userId: string): Promise<HeadToHead[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_head_to_head', { p_user_id: userId })
    if (error || !data) return []
    return (data as { opponent_id: string; matches: number; wins: number; losses: number; draws: number }[]).map(
        (row) => ({ opponentId: row.opponent_id, wins: row.wins, losses: row.losses, draws: row.draws ?? 0 })
    )
}
