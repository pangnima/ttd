import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Court, CourtSurface, Match, MatchGame, MatchResult, MatchType, Round, TimeSlot, User } from '@/types'
import { mapUserRow } from '@/lib/queries/users'

type MatchGameRow       = Database['public']['Tables']['match_games']['Row']
type CourtRow           = Database['public']['Tables']['match_game_courts']['Row']
type RoundRow           = Database['public']['Tables']['match_game_rounds']['Row']
type TimeSlotRow        = Database['public']['Tables']['match_game_time_slots']['Row']
type MatchRow           = Database['public']['Tables']['match_game_matches']['Row']
type MatchParticipantRow = Database['public']['Tables']['match_game_participants']['Row']
type UserRow            = Database['public']['Tables']['users']['Row']

function mapCourtRow(row: CourtRow): Court {
    return {
        id: row.id,
        label: row.label,
        order: row.order,
        surface: (row.surface as CourtSurface) ?? undefined,
    }
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
// 단식/복식 다형성은 match_game_participants(side별 1~2행)로 정규화되어 있으므로,
// side('team1'/'team2')·is_ad로 그룹핑해 예전 플랫 컬럼 형태로 복원한다.
export function mapMatchRow(row: MatchRow & { participants?: MatchParticipantRow[] }): Match {
    let result: MatchResult | undefined
    if (row.result_sets && row.winner_id) {
        const sets = (row.result_sets as Array<{ team1: number; team2: number }>)
        result = { sets, winnerId: row.winner_id as 'team1' | 'team2' | 'draw' }
    }
    const participants = row.participants ?? []
    const team1 = participants.filter((p) => p.side === 'team1').map((p) => p.user_id)
    const team2 = participants.filter((p) => p.side === 'team2').map((p) => p.user_id)
    const team1Ad = participants.find((p) => p.side === 'team1' && p.is_ad)?.user_id
    const team2Ad = participants.find((p) => p.side === 'team2' && p.is_ad)?.user_id
    const isSingles = row.match_type === 'singles'

    return {
        id: row.id,
        matchGameId: row.match_game_id,
        roundId: row.round_id,
        courtId: row.court_id,
        timeSlotId: row.time_slot_id,
        matchType: row.match_type as MatchType,
        player1Id: isSingles ? team1[0] : undefined,
        player2Id: isSingles ? team2[0] : undefined,
        team1: isSingles ? undefined : team1,
        team2: isSingles ? undefined : team2,
        team1AdPlayerId: isSingles ? undefined : team1Ad,
        team2AdPlayerId: isSingles ? undefined : team2Ad,
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
    const courts = row.courts.map(mapCourtRow)
    const rounds = row.rounds.map(mapRoundRow)
    const matches = [...row.matches]
        .sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : 1))
        .map(mapMatchRow)

    return {
        id: row.id,
        clubId: row.club_id,
        name: row.name,
        date: row.date,
        isFixed: row.is_fixed,
        createdAt: row.created_at,
        courts,
        rounds,
        matches,
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
            matches:match_game_matches(*, participants:match_game_participants(*))
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
            matches:match_game_matches(*, participants:match_game_participants(*))
        `)
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapMatchGameRow(data as Parameters<typeof mapMatchGameRow>[0])
}

export type MatchGameMeta = { id: string; name: string; date: string; clubId: string }

// 단식/복식 모두 커버하는 단일 쿼리. match_game_participants(user_id=본인)에서 시작해
// 소속 match_game_matches를 역참조(has-one)로 embed한다 — 단식/복식 구분 없이 참가자 테이블 하나로 필터.
// match_games(name, date)와 court:match_game_courts(surface)도 함께 embed해서 메타/표면 정보 동봉.
// clubId 지정 시 해당 클럽의 경기만 반환 (JS 필터).
export async function fetchMatchesByUser(userId: string, clubId?: string): Promise<{
    matches: Match[]
    gameMetaById: Record<string, MatchGameMeta>
    courtSurfaceByMatchId: Record<string, CourtSurface | null>
    matchTimeById: Record<string, string | null>
}> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_game_participants')
        .select('match:match_game_matches(*, match_games(id, name, date, club_id, is_fixed), court:match_game_courts(surface), time_slot:match_game_time_slots(start_at), participants:match_game_participants(*))')
        .eq('user_id', userId)
    if (error || !data) return { matches: [], gameMetaById: {}, courtSurfaceByMatchId: {}, matchTimeById: {} }

    const rows = data.map((r) => r.match).filter((m): m is NonNullable<typeof m> => !!m)

    // 클라이언트 집계와 RPC 통계(is_fixed=true, status='finished' 기준)의 모집단을 통일.
    const fixedData = rows.filter((row) => {
        const g = row.match_games as { is_fixed: boolean } | null
        return g?.is_fixed === true && row.status === 'finished'
    })

    const gameMetaById: Record<string, MatchGameMeta> = {}
    const courtSurfaceByMatchId: Record<string, CourtSurface | null> = {}
    const matchTimeById: Record<string, string | null> = {}
    for (const row of fixedData) {
        const g = row.match_games as { id: string; name: string; date: string; club_id: string } | null
        if (g) gameMetaById[g.id] = { id: g.id, name: g.name, date: g.date, clubId: g.club_id }
        const c = row.court as { surface: string | null } | null
        courtSurfaceByMatchId[row.id] = (c?.surface as CourtSurface) ?? null
        const ts = row.time_slot as { start_at: string | null } | null
        // 'HH:MM:SS' → 'HH:MM' (요일×시간 히트맵용)
        matchTimeById[row.id] = ts?.start_at ? ts.start_at.slice(0, 5) : null
    }

    const allMatches = fixedData.map((row) => mapMatchRow(row as MatchRow))
    const matches = clubId
        ? allMatches.filter((m) => gameMetaById[m.matchGameId]?.clubId === clubId)
        : allMatches

    return { matches, gameMetaById, courtSurfaceByMatchId, matchTimeById }
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
