'use server'

// RLS 의존성:
//   - CREATE/UPDATE: approved member (RPC 내부에서 검증)
//   - DELETE match_games: owner (RLS 정책으로 강제)
//   - 경기 결과 입력(saveMatchResult): approved member
//   - 결과 확정(confirm): owner — RLS만으로는 부족해 Server Action에서 role 체크를 이중 방어

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { recalculateClubRatings } from './ratings'
import type { Court, Match, MatchType, Round } from '@/types'

// temp_id 패턴: 클라이언트는 임시 UUID로 courts/rounds/timeSlots를 연결하고,
// RPC 내부에서 INSERT 후 실제 DB ID로 매핑하여 matches에 FK를 연결함.
function buildMatchGamePayload(courts: Court[], rounds: Round[], matches: Match[]) {
    const courtsPayload = courts.map((c) => ({
        temp_id: c.id,
        label: c.label,
        order: c.order,
        surface: c.surface ?? null,
    }))

    const roundsPayload = rounds.map((r) => ({
        temp_id: r.id,
        label: r.label,
        order: r.order,
        time_slots: r.timeSlots.map((ts) => ({
            temp_id: ts.id,
            start_at: ts.startAt,
            end_at: ts.endAt,
        })),
    }))

    const matchesPayload = matches.map((m) => ({
        court_temp_id: m.courtId,
        round_temp_id: m.roundId,
        time_slot_temp_id: m.timeSlotId,
        match_type: m.matchType as MatchType,
        player1_id: m.player1Id ?? '',
        player2_id: m.player2Id ?? '',
        team1: m.team1 ?? [],
        team2: m.team2 ?? [],
        prev_match_id: m.prevMatchId ?? null,
    }))

    return { courtsPayload, roundsPayload, matchesPayload }
}

type ActionResult = { ok: false; error: string } | { ok: true }

// RPC `create_match_game`: match_games + courts + rounds + time_slots + matches를 단일 트랜잭션으로 INSERT.
// temp_id 패턴으로 클라이언트 임시 ID를 DB 실제 ID에 매핑.
export async function createMatchGameAction(
    clubId: string,
    name: string,
    date: string,
    courts: Court[],
    rounds: Round[],
    matches: Match[]
): Promise<ActionResult & { matchGameId?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { courtsPayload, roundsPayload, matchesPayload } = buildMatchGamePayload(courts, rounds, matches)

    const { data, error } = await supabase.rpc('create_match_game', {
        p_club_id: clubId,
        p_name: name,
        p_date: date,
        p_courts: courtsPayload,
        p_rounds: roundsPayload,
        p_matches: matchesPayload,
    })

    if (error) return { ok: false, error: error.message }

    revalidatePath(`/clubs/${clubId}/match-games`, 'layout')
    return { ok: true, matchGameId: data as string }
}

// DELETE는 RLS에서 owner만 허용 — Server Action 추가 체크 없이 DB 오류로 반환
export async function deleteMatchGameAction(
    clubId: string,
    matchGameId: string
): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    // 확정 대진표 삭제는 레이팅 모집단을 바꾸므로 삭제 전 is_fixed 여부를 확인해 둔다.
    const { data: gameBefore } = await supabase
        .from('match_games')
        .select('is_fixed')
        .eq('id', matchGameId)
        .maybeSingle()

    const { error } = await supabase
        .from('match_games')
        .delete()
        .eq('id', matchGameId)

    if (error) return { ok: false, error: error.message }

    // 확정 대진표를 삭제한 경우에만 재계산(삭제는 owner만 가능하므로 RPC 권한 충족).
    if (gameBefore?.is_fixed) await recalculateClubRatings(clubId)

    revalidatePath(`/clubs/${clubId}/match-games`, 'layout')
    return { ok: true }
}

// winner_id는 외래키가 아닌 사이드 식별자 리터럴 ('team1' | 'team2' | 'draw').
// 단식에서 player1 = team1, player2 = team2 로 매핑되는 규약에 따름.
export async function saveMatchResultAction(
    clubId: string,
    matchGameId: string,
    matchId: string,
    sets: Array<{ team1: number; team2: number }>,
    winnerId: 'team1' | 'team2' | 'draw'
): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('match_game_matches')
        .update({
            status: 'finished',
            result_sets: sets,
            winner_id: winnerId,
        })
        .eq('id', matchId)

    if (error) return { ok: false, error: error.message }

    revalidatePath(`/clubs/${clubId}/match-games/${matchGameId}`)
    return { ok: true }
}

// 복식 전용 — 각 팀에서 애드코트(백핸드 사이드)를 맡은 선수 ID를 저장.
// null은 미지정 상태 (기본적으로 듀스코트/포핸드 사이드).
// 단식 경기에서는 이 액션이 호출되지 않음.
export async function saveCourtSidesAction(
    clubId: string,
    matchGameId: string,
    matchId: string,
    team1AdPlayerId: string | null,
    team2AdPlayerId: string | null
): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('match_game_matches')
        .update({
            team1_ad_player_id: team1AdPlayerId,
            team2_ad_player_id: team2AdPlayerId,
        })
        .eq('id', matchId)

    if (error) return { ok: false, error: error.message }

    // 코트 배치는 클라이언트 state(courtSides)가 즉시 반영하므로 페이지 전체 재조회가 불필요하다.
    // revalidatePath를 호출하면 매 토글마다 무거운 대진표 쿼리들이 재실행되어 UI가 잠기므로 생략한다.
    // 저장된 값은 다음 전체 로드 시 DB에서 자연스럽게 동기화된다. (clubId/matchGameId는 시그니처 호환을 위해 유지)
    void clubId
    void matchGameId
    return { ok: true }
}

// is_fixed = true: 이후 모든 수정 잠금 + 통계 집계에 반영되는 확정 상태.
// RLS만으로는 owner 체크가 불충분한 경우를 대비해 Server Action에서 role을 이중 방어.
export async function confirmMatchGameAction(
    clubId: string,
    matchGameId: string
): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { data: membership } = await supabase
        .from('club_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('club_id', clubId)
        .eq('status', 'approved')
        .maybeSingle()

    if (membership?.role !== 'owner') {
        return { ok: false, error: '클럽장만 결과를 확정할 수 있습니다.' }
    }

    const { error } = await supabase
        .from('match_games')
        .update({ is_fixed: true })
        .eq('id', matchGameId)

    if (error) return { ok: false, error: error.message }

    // 확정으로 이 대진표의 경기가 통계·레이팅 모집단에 편입됐으므로 클럽 레이팅 재계산.
    // 결과 확정 자체는 성공했으므로 재계산 실패는 전체 액션을 실패시키지 않는다(추후 재계산 가능).
    await recalculateClubRatings(clubId)

    // 목록(완료/진행중 배지)과 상세(확정 잠금·레이팅 변동)를 모두 갱신해야 한다.
    // 'layout' 옵션으로 match-games 하위(상세 포함)를 한 번에 무효화해 중복 호출을 제거.
    revalidatePath(`/clubs/${clubId}/match-games`, 'layout')
    return { ok: true }
}

export async function addGuestPlayerAction(
    clubId: string,
    nickname: string,
    gender: 'male' | 'female'
): Promise<ActionResult & { userId?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    if (!nickname.trim()) return { ok: false, error: '닉네임을 입력해주세요.' }

    const { data, error } = await supabase.rpc('add_guest_player', {
        p_club_id: clubId,
        p_nickname: nickname.trim(),
        p_gender: gender,
    })

    if (error) return { ok: false, error: error.message }

    return { ok: true, userId: data as string }
}

// RPC `update_match_game`: 기존 courts/rounds/time_slots/matches를 전부 삭제하고 재생성 (트랜잭션).
// DB 함수가 RAISE하는 에러 코드: has_results(결과 있음), match_game_fixed(확정됨), not_owner(권한 없음).
export async function updateMatchGameAction(
    clubId: string,
    matchGameId: string,
    name: string,
    date: string,
    courts: Court[],
    rounds: Round[],
    matches: Match[]
): Promise<ActionResult & { matchGameId?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { courtsPayload, roundsPayload, matchesPayload } = buildMatchGamePayload(courts, rounds, matches)

    const { data, error } = await supabase.rpc('update_match_game', {
        p_match_game_id: matchGameId,
        p_name: name,
        p_date: date,
        p_courts: courtsPayload,
        p_rounds: roundsPayload,
        p_matches: matchesPayload,
    })

    if (error) {
        const msg = error.message.includes('match_game_fixed') ? '확정된 대진표는 클럽장만 수정할 수 있습니다.'
                  : error.message.includes('not_member')       ? '클럽 멤버만 수정할 수 있습니다.'
                  : error.message
        return { ok: false, error: msg }
    }

    // 확정 대진표를 수정한 경우에만 레이팅 재계산(확정 수정은 owner만 가능 → RPC 권한 충족).
    const { data: gameAfter } = await supabase
        .from('match_games')
        .select('is_fixed')
        .eq('id', matchGameId)
        .maybeSingle()
    if (gameAfter?.is_fixed) await recalculateClubRatings(clubId)

    revalidatePath(`/clubs/${clubId}/match-games`, 'layout')
    return { ok: true, matchGameId: data as string }
}
