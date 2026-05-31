import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { mapUserRow } from '@/lib/queries/users'
import type { Database } from '@/types/supabase'
import type { User } from '@/types'

type UserRow = Database['public']['Tables']['users']['Row']

export type PendingMemberWithUser = {
    userId: string
    clubId: string
    joinedAt: string
    user: User
}

export type ClubMemberStats = {
    totalCount: number
    newThisMonthCount: number
    activeThisMonthCount: number
}

export type ClubMatchGameSummary = {
    id: string
    name: string
    date: string
    isFixed: boolean
}

export type ClubMatchGameActivity = {
    recentGames: ClubMatchGameSummary[]
    fixedCount: number
    pendingCount: number
    nextGame: ClubMatchGameSummary | null
}

export type ActivityRankingEntry = {
    userId: string
    user: User | null
    matchCount: number
    winCount: number
}

export type WinRateRankingEntry = {
    userId: string
    user: User | null
    matchCount: number
    winCount: number
    lossCount: number
    winRate: number
}

export type ClubWinRateRanking = {
    singles: WinRateRankingEntry[]
    menDoubles: WinRateRankingEntry[]
    womenDoubles: WinRateRankingEntry[]
    mixedDoubles: WinRateRankingEntry[]
}

export async function fetchPendingMembersByClubId(clubId: string): Promise<PendingMemberWithUser[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('*, users(*)')
        .eq('club_id', clubId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: true })
    if (error || !data) return []
    return data
        .filter((row) => row.users)
        .map((row) => ({
            userId: row.user_id,
            clubId: row.club_id,
            joinedAt: row.joined_at,
            user: mapUserRow(row.users as UserRow),
        }))
}

export async function fetchClubMemberStats(clubId: string): Promise<ClubMemberStats> {
    const supabase = await createClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

    const { data: allMembers } = await supabase
        .from('club_members')
        .select('user_id, joined_at')
        .eq('club_id', clubId)
        .eq('status', 'approved')

    const totalCount = allMembers?.length ?? 0
    const newThisMonthCount = allMembers?.filter((m) => m.joined_at >= thirtyDaysAgoIso).length ?? 0

    // 최근 30일 이내 is_fixed 대진표에 참여한 distinct 회원 수 (활동률 산출용)
    const { data: activeData } = await supabase
        .from('match_game_matches')
        .select('player1_id, player2_id, team1, team2, match_games!inner(club_id, is_fixed, date)')
        .eq('match_games.club_id', clubId)
        .eq('match_games.is_fixed', true)
        .gte('match_games.date', thirtyDaysAgoIso.split('T')[0])
        .eq('status', 'finished')

    const activeUserIds = new Set<string>()
    for (const row of activeData ?? []) {
        if (row.player1_id) activeUserIds.add(row.player1_id)
        if (row.player2_id) activeUserIds.add(row.player2_id)
        for (const id of row.team1 ?? []) activeUserIds.add(id)
        for (const id of row.team2 ?? []) activeUserIds.add(id)
    }

    return { totalCount, newThisMonthCount, activeThisMonthCount: activeUserIds.size }
}

export async function fetchClubMatchGameActivity(clubId: string): Promise<ClubMatchGameActivity> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('match_games')
        .select('id, name, date, is_fixed')
        .eq('club_id', clubId)
        .order('date', { ascending: false })
        .limit(20)

    if (error || !data) {
        return { recentGames: [], fixedCount: 0, pendingCount: 0, nextGame: null }
    }

    const fixedCount = data.filter((g) => g.is_fixed).length
    const pendingCount = data.filter((g) => !g.is_fixed).length

    // 오늘 이후 가장 빠른 미래 대진표
    const upcomingGames = data.filter((g) => g.date >= today && !g.is_fixed)
    const nextGame = upcomingGames.length > 0
        ? upcomingGames[upcomingGames.length - 1]
        : null

    const recentGames = data.slice(0, 5).map((g) => ({
        id: g.id,
        name: g.name,
        date: g.date,
        isFixed: g.is_fixed,
    }))

    return {
        recentGames,
        fixedCount,
        pendingCount,
        nextGame: nextGame ? { id: nextGame.id, name: nextGame.name, date: nextGame.date, isFixed: nextGame.is_fixed } : null,
    }
}

export async function fetchClubWinRateRanking(clubId: string): Promise<ClubWinRateRanking> {
    const supabase = await createClient()

    const { data: rankData, error: rankErr } = await supabase
        .rpc('get_club_win_rate_ranking', { p_club_id: clubId })
    if (rankErr || !rankData || rankData.length === 0) return { singles: [], menDoubles: [], womenDoubles: [], mixedDoubles: [] }

    const userIds = [...new Set(rankData.map((r) => r.user_id as string))]
    const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)

    const userMap = new Map((usersData ?? []).map((u) => [u.id, mapUserRow(u as UserRow)]))

    const toEntry = (r: { user_id: string; match_count: number; win_count: number; loss_count: number; win_rate: number }): WinRateRankingEntry => ({
        userId: r.user_id,
        user: userMap.get(r.user_id) ?? null,
        matchCount: Number(r.match_count),
        winCount: Number(r.win_count),
        lossCount: Number(r.loss_count),
        winRate: Number(r.win_rate),
    })

    return {
        singles: rankData.filter((r) => r.match_type_group === 'singles').map(toEntry),
        menDoubles: rankData.filter((r) => r.match_type_group === 'men_doubles').map(toEntry),
        womenDoubles: rankData.filter((r) => r.match_type_group === 'women_doubles').map(toEntry),
        mixedDoubles: rankData.filter((r) => r.match_type_group === 'mixed_doubles').map(toEntry),
    }
}

export async function fetchClubActivityRanking(clubId: string): Promise<ActivityRankingEntry[]> {
    const supabase = await createClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: rankData, error: rankErr } = await supabase
        .rpc('get_club_activity_ranking', {
            p_club_id: clubId,
            p_since: thirtyDaysAgo.toISOString(),
        })
    if (rankErr || !rankData || rankData.length === 0) return []

    const userIds = rankData.map((r) => r.user_id)
    const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds)

    const userMap = new Map((usersData ?? []).map((u) => [u.id, mapUserRow(u as UserRow)]))

    return rankData.map((r) => ({
        userId: r.user_id,
        user: userMap.get(r.user_id) ?? null,
        matchCount: r.match_count,
        winCount: r.win_count,
    }))
}
