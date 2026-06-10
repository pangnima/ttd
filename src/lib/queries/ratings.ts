import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { mapMatchRow } from '@/lib/queries/match-games'
import { mapUserRow } from '@/lib/queries/users'
import type { Database } from '@/types/supabase'
import type { Match, User } from '@/types'

type MatchRow = Database['public']['Tables']['match_game_matches']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

// 클럽 레이팅 현재값 (게스트 포함). 행이 없는 멤버는 호출 측에서 기본 2.5로 coalesce.
export type ClubRating = { rating: number; matchesPlayed: number }

export async function fetchClubPlayerRatings(
    clubId: string,
): Promise<Record<string, ClubRating>> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_player_ratings')
        .select('user_id, rating, matches_played')
        .eq('club_id', clubId)
    if (error || !data) return {}

    const result: Record<string, ClubRating> = {}
    for (const row of data) {
        result[row.user_id] = { rating: Number(row.rating), matchesPlayed: row.matches_played }
    }
    return result
}

// 클럽 레이팅 랭킹 (레이팅 내림차순). 행은 확정 경기에 참여한 선수만 존재(게스트 포함).
export type ClubRatingRankingEntry = {
    userId: string
    user: User | null
    rating: number
    matchesPlayed: number
}

export async function fetchClubRatingRanking(clubId: string): Promise<ClubRatingRankingEntry[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_player_ratings')
        .select('user_id, rating, matches_played, user:users(*)')
        .eq('club_id', clubId)
        .order('rating', { ascending: false })
        .order('matches_played', { ascending: false })
    if (error || !data) return []

    return data.map((row) => ({
        userId: row.user_id,
        user: row.user ? mapUserRow(row.user as UserRow) : null,
        rating: Number(row.rating),
        matchesPlayed: row.matches_played,
    }))
}

// 재계산 입력: 클럽의 확정(is_fixed)·종료(finished) 경기를 결정적 순서로 정렬해 반환.
// 정렬키: match_game.date → round.order → time_slot.start_at → match.order → match.id
// (docs/rating-system.md §2.7)
export async function fetchConfirmedMatchesForRating(clubId: string): Promise<{
    matches: Match[]
    dateByMatchId: Record<string, string>
}> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_game_matches')
        .select(
            '*, match_games!inner(date, club_id, is_fixed), round:match_game_rounds(order), slot:match_game_time_slots(start_at)',
        )
        .eq('match_games.club_id', clubId)
        .eq('match_games.is_fixed', true)
        .eq('status', 'finished')
    if (error || !data) return { matches: [], dateByMatchId: {} }

    type Embedded = MatchRow & {
        match_games: { date: string } | null
        round: { order: number } | null
        slot: { start_at: string } | null
    }
    const rows = data as unknown as Embedded[]

    const sortKey = (r: Embedded): [string, number, string, number, string] => [
        r.match_games?.date ?? '',
        r.round?.order ?? 0,
        r.slot?.start_at ?? '',
        r.order,
        r.id,
    ]

    const sorted = [...rows].sort((a, b) => {
        const ka = sortKey(a)
        const kb = sortKey(b)
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] < kb[i]) return -1
            if (ka[i] > kb[i]) return 1
        }
        return 0
    })

    const dateByMatchId: Record<string, string> = {}
    for (const r of sorted) dateByMatchId[r.id] = r.match_games?.date ?? ''

    return { matches: sorted.map((r) => mapMatchRow(r)), dateByMatchId }
}
