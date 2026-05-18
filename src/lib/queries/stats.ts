import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PlayerStats, HeadToHead } from '@/lib/stats'

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

export async function fetchUserHeadToHead(userId: string): Promise<HeadToHead[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_head_to_head', { p_user_id: userId })
    if (error || !data) return []
    return (data as { opponent_id: string; matches: number; wins: number; losses: number; draws: number }[]).map(
        (row) => ({ opponentId: row.opponent_id, wins: row.wins, losses: row.losses, draws: row.draws ?? 0 })
    )
}
