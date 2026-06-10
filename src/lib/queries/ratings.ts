import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { mapMatchRow } from '@/lib/queries/match-games'
import { mapUserRow } from '@/lib/queries/users'
import type { Database } from '@/types/supabase'
import type { ClubRating, Match, User } from '@/types'

type MatchRow = Database['public']['Tables']['match_game_matches']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

export type { ClubRating }

// 클럽 레이팅 현재값 (게스트 포함). 행이 없는 멤버는 호출 측에서 기본 2.5로 coalesce.
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

// 특정 (club, user)의 시간순 레이팅 추세. 마지막 ratingAfter = 현재 레이팅, 길이 = 경기 수.
export type RatingHistoryPoint = {
    createdAt: string
    ratingBefore: number
    ratingAfter: number
    delta: number
    matchId: string | null
}

export async function fetchClubRatingHistory(
    clubId: string,
    userId: string,
): Promise<RatingHistoryPoint[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_rating_history')
        .select('created_at, rating_before, rating_after, delta, match_id')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    if (error || !data) return []

    return data.map((row) => ({
        createdAt: row.created_at,
        ratingBefore: Number(row.rating_before),
        ratingAfter: Number(row.rating_after),
        delta: Number(row.delta),
        matchId: row.match_id,
    }))
}

// 대진표(여러 match)의 경기별·선수별 레이팅 변동. byUserTotal은 대진표 전체 합계(내림차순).
export type MatchGameRatingDeltas = {
    byMatch: Record<string, Record<string, number>>
    byUserTotal: Array<{ userId: string; total: number }>
}

export async function fetchRatingDeltasByMatchGameId(
    matchIds: string[],
): Promise<MatchGameRatingDeltas> {
    if (matchIds.length === 0) return { byMatch: {}, byUserTotal: [] }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_rating_history')
        .select('match_id, user_id, delta')
        .in('match_id', matchIds)
    if (error || !data) return { byMatch: {}, byUserTotal: [] }

    const byMatch: Record<string, Record<string, number>> = {}
    const totals = new Map<string, number>()
    for (const row of data) {
        if (!row.match_id) continue
        const delta = Number(row.delta)
        ;(byMatch[row.match_id] ??= {})[row.user_id] = delta
        totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + delta)
    }

    const byUserTotal = [...totals.entries()]
        .map(([userId, total]) => ({ userId, total }))
        .sort((a, b) => b.total - a.total)

    return { byMatch, byUserTotal }
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
