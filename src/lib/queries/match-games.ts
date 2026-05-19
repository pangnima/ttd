import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Court, Match, MatchGame, MatchResult, MatchType, Round, TimeSlot, User } from '@/types'
import { mapUserRow } from '@/lib/queries/users'

type MatchGameRow       = Database['public']['Tables']['match_games']['Row']
type CourtRow           = Database['public']['Tables']['match_game_courts']['Row']
type RoundRow           = Database['public']['Tables']['match_game_rounds']['Row']
type TimeSlotRow        = Database['public']['Tables']['match_game_time_slots']['Row']
type MatchRow           = Database['public']['Tables']['match_game_matches']['Row']
type UserRow            = Database['public']['Tables']['users']['Row']

function mapCourtRow(row: CourtRow): Court {
    return { id: row.id, label: row.label, order: row.order }
}

function mapTimeSlotRow(row: TimeSlotRow): TimeSlot {
    return { id: row.id, startAt: row.start_at, endAt: row.end_at }
}

function mapRoundRow(row: RoundRow & { time_slots: TimeSlotRow[] }): Round {
    return {
        id: row.id,
        label: row.label,
        order: row.order,
        timeSlots: row.time_slots.map(mapTimeSlotRow),
    }
}

// DB row → Match 도메인 타입 변환.
// result_sets는 JSONB 컬럼이므로 Array<{team1, team2}> 로 캐스팅 필요.
// winner_id는 외래키가 아닌 사이드 식별자 리터럴 ('team1' | 'team2' | 'draw').
//   단식에서 player1 = team1, player2 = team2 로 매핑되는 규약에 따름.
// player1Id/player2Id(단식)와 team1/team2(복식)는 상호 배제 —
//   matchType이 'singles'이면 player1/2만, 복식이면 team1/2만 유효.
function mapMatchRow(row: MatchRow): Match {
    let result: MatchResult | undefined
    if (row.result_sets && row.winner_id) {
        const sets = (row.result_sets as Array<{ team1: number; team2: number }>)
        result = { sets, winnerId: row.winner_id as 'team1' | 'team2' | 'draw' }
    }
    return {
        id: row.id,
        matchGameId: row.match_game_id,
        roundId: row.round_id,
        courtId: row.court_id,
        timeSlotId: row.time_slot_id,
        matchType: row.match_type as MatchType,
        player1Id: row.player1_id ?? undefined,
        player2Id: row.player2_id ?? undefined,
        team1: row.team1 ?? undefined,
        team2: row.team2 ?? undefined,
        team1AdPlayerId: row.team1_ad_player_id ?? undefined,
        team2AdPlayerId: row.team2_ad_player_id ?? undefined,
        status: row.status as Match['status'],
        result,
    }
}

function mapMatchGameRow(
    row: MatchGameRow & {
        courts: CourtRow[]
        rounds: (RoundRow & { time_slots: TimeSlotRow[] })[]
        matches: MatchRow[]
    }
): MatchGame {
    return {
        id: row.id,
        clubId: row.club_id,
        name: row.name,
        date: row.date,
        isFixed: row.is_fixed,
        createdAt: row.created_at,
        courts: row.courts.map(mapCourtRow),
        rounds: row.rounds.map(mapRoundRow),
        matches: row.matches.map(mapMatchRow),
    }
}


// PostgREST embed 문법(alias:table(*))으로 4개 테이블을 단일 쿼리로 JOIN.
// RLS는 match_games, match_game_courts, match_game_rounds, match_game_matches 각 테이블에 독립 적용됨.
export async function fetchMatchGamesByClubId(clubId: string): Promise<MatchGame[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_games')
        .select(`
            *,
            courts:match_game_courts(*),
            rounds:match_game_rounds(*, time_slots:match_game_time_slots(*)),
            matches:match_game_matches(*)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map((row) => mapMatchGameRow(row as Parameters<typeof mapMatchGameRow>[0]))
}

export async function fetchMatchGameById(id: string): Promise<MatchGame | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_games')
        .select(`
            *,
            courts:match_game_courts(*),
            rounds:match_game_rounds(*, time_slots:match_game_time_slots(*)),
            matches:match_game_matches(*)
        `)
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapMatchGameRow(data as Parameters<typeof mapMatchGameRow>[0])
}

// 단식/복식 모두 커버하는 단일 쿼리.
// - 단식: player1_id.eq / player2_id.eq
// - 복식: team1.cs.{userId} / team2.cs.{userId}
//   cs = PostgreSQL 배열 contains 연산자 ({userId}는 배열 리터럴 형식)
export async function fetchMatchesByUser(userId: string): Promise<Match[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_game_matches')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId},team1.cs.{${userId}},team2.cs.{${userId}}`)
        .eq('status', 'finished')
    if (error || !data) return []
    return data.map(mapMatchRow)
}

export async function fetchClubMembersWithGuests(clubId: string): Promise<User[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('*, users(*)')
        .eq('club_id', clubId)
        .eq('status', 'approved')
        .order('joined_at', { ascending: true })
    if (error || !data) return []
    return data
        .filter((row) => row.users)
        .map((row) => mapUserRow(row.users as UserRow))
}
