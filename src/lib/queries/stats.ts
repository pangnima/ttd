import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { PlayerStats, HeadToHead } from '@/lib/stats'

type RawStats = {
    matches: number
    wins: number
    losses: number
    draws: number
}

// get_user_match_stats_v2 RPC의 반환 구조 (4분기 + sets).
type RawStatsV2 = RawStats & { sets_won: number; sets_lost: number }

type RawMatchStatsV2 = {
    singles: RawStatsV2
    men_doubles: RawStatsV2
    women_doubles: RawStatsV2
    mixed_doubles: RawStatsV2
}

export type CourtStat = { matches: number; wins: number; losses: number; draws: number }

export type DoublesCourtStats = { ad: CourtStat; deuce: CourtStat }

export type PartnerStat = {
    partnerId: string
    matches: number
    wins: number
    losses: number
    draws: number
}

// decisive = wins + losses (무승부 제외 분모): 승률은 무승부를 포함하지 않는 백분율.
function makePlayerStatsV2(raw: RawStatsV2): PlayerStats {
    const decisive = raw.wins + raw.losses
    return {
        wins: raw.wins,
        losses: raw.losses,
        draws: raw.draws ?? 0,
        totalMatches: decisive + (raw.draws ?? 0),
        winRate: decisive === 0 ? 0 : Math.round((raw.wins / decisive) * 100),
        setsWon: raw.sets_won ?? 0,
        setsLost: raw.sets_lost ?? 0,
        byMatchType: [],
    }
}

const EMPTY_RAW_V2: RawStatsV2 = { matches: 0, wins: 0, losses: 0, draws: 0, sets_won: 0, sets_lost: 0 }
const EMPTY_COURT: CourtStat = { matches: 0, wins: 0, losses: 0, draws: 0 }

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

// Supabase RPC `get_user_match_stats_v2`: 4분기(단식·남복·여복·혼복) + sets 통계 조회.
export async function fetchUserMatchStatsV2(userId: string): Promise<{
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
}> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_match_stats_v2', { p_user_id: userId })
    if (error || !data) {
        const empty = makePlayerStatsV2(EMPTY_RAW_V2)
        return { singles: empty, menDoubles: empty, womenDoubles: empty, mixedDoubles: empty }
    }
    const raw = data as RawMatchStatsV2
    return {
        singles: makePlayerStatsV2(raw.singles ?? EMPTY_RAW_V2),
        menDoubles: makePlayerStatsV2(raw.men_doubles ?? EMPTY_RAW_V2),
        womenDoubles: makePlayerStatsV2(raw.women_doubles ?? EMPTY_RAW_V2),
        mixedDoubles: makePlayerStatsV2(raw.mixed_doubles ?? EMPTY_RAW_V2),
    }
}

// Supabase RPC `get_user_doubles_court_stats`: 복식 기준 애드/듀스 코트별 승패.
export async function fetchUserDoublesCourtStats(userId: string): Promise<DoublesCourtStats> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_doubles_court_stats', { p_user_id: userId })
    if (error || !data) return { ad: { ...EMPTY_COURT }, deuce: { ...EMPTY_COURT } }
    const raw = data as DoublesCourtStats
    return {
        ad: raw.ad ?? { ...EMPTY_COURT },
        deuce: raw.deuce ?? { ...EMPTY_COURT },
    }
}

// Supabase RPC `get_user_partner_stats`: 복식 동일 팀 파트너별 전적 조회.
export async function fetchUserPartnerStats(userId: string): Promise<PartnerStat[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_partner_stats', { p_user_id: userId })
    if (error || !data) return []
    return (data as { partner_id: string; matches: number; wins: number; losses: number; draws: number }[]).map(
        (row) => ({
            partnerId: row.partner_id,
            matches: row.matches,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws ?? 0,
        })
    )
}
