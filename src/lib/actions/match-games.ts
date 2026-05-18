'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Court, Match, MatchType, Round } from '@/types'

type ActionResult = { ok: false; error: string } | { ok: true }

// MatchGame 생성: RPC로 단일 트랜잭션 저장
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

    const courtsPayload = courts.map((c) => ({
        temp_id: c.id,
        label: c.label,
        order: c.order,
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
    }))

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

// MatchGame 삭제 (RLS: owner만 가능)
export async function deleteMatchGameAction(
    clubId: string,
    matchGameId: string
): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('match_games')
        .delete()
        .eq('id', matchGameId)

    if (error) return { ok: false, error: error.message }

    revalidatePath(`/clubs/${clubId}/match-games`, 'layout')
    return { ok: true }
}

// 경기 결과 저장 (단건 UPDATE)
export async function saveMatchResultAction(
    clubId: string,
    matchGameId: string,
    matchId: string,
    sets: Array<{ team1: number; team2: number }>,
    winnerId: string
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
    revalidatePath('/dashboard')
    return { ok: true }
}

// MatchGame 결과 확정 (클럽장 전용: is_fixed = true)
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

    revalidatePath(`/clubs/${clubId}/match-games`)
    revalidatePath(`/clubs/${clubId}/match-games/${matchGameId}`)
    return { ok: true }
}

// 게스트 플레이어 추가: RPC로 users + club_members 트랜잭션
export async function addGuestPlayerAction(
    clubId: string,
    nickname: string
): Promise<ActionResult & { userId?: string }> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    if (!nickname.trim()) return { ok: false, error: '닉네임을 입력해주세요.' }

    const { data, error } = await supabase.rpc('add_guest_player', {
        p_club_id: clubId,
        p_nickname: nickname.trim(),
    })

    if (error) return { ok: false, error: error.message }

    return { ok: true, userId: data as string }
}
