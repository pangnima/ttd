'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType, RotationPoolPlayer } from '@/types'
import type { RotationGamePayload } from '@/lib/personal-matches/rotation'
import { isDoublesMatchType, validateCourtName, validateSetScores } from '@/lib/personal-matches/validate-input'
import { recomputePersonalNtrp } from '@/lib/actions/personal-matches'
import { listRecordAsRoom, type RoomListingInput } from '@/lib/match-rooms/create-room'
import { revalidateRoomList, revalidateRoomPaths } from '@/lib/match-rooms/revalidate'

/**
 * 로테이션(파트너 교체) 복식 세션 — 등록 시 선수 풀만 저장(rotation_sessions),
 * 게임(팀 구성+세트)은 카드 '결과 입력'에서 finalize RPC로 게임별 personal_matches 행으로 분해한다.
 * 세션 자체는 어떤 통계에도 잡히지 않는다.
 */

type ActionResult = { error: string | null }

export type RotationSessionInput = {
    playedAt: string
    playedTime: string  // 'HH:MM'
    matchType: MatchType
    surface: CourtSurface
    notes?: string
    courtName?: string  // 선택, ≤40자 — finalize 시 모든 게임에 상속
    players: RotationPoolPlayer[]  // 나 제외, 3명 이상
}

const MAX_GAMES = 20

function validatePlayer(p: RotationPoolPlayer): string | null {
    if (!p.name.trim()) return '참가자 이름을 입력해주세요.'
    if (!p.userId && !p.hand) return '비회원 참가자는 손잡이를 선택해주세요.'
    if (p.hand != null && !['right', 'left'].includes(p.hand)) return '손잡이 값이 올바르지 않습니다.'
    // 풀 전원 NTRP 필수 — 게임에서 파트너/상대 어느 역할이든 개인 레이팅 계산에 쓰인다 (페어 고정 폼과 동일 규칙)
    if (p.ntrp == null) return '참가자 NTRP를 입력해주세요.'
    if (!Number.isFinite(p.ntrp) || p.ntrp < 1 || p.ntrp > 7) return 'NTRP는 1.0~7.0 범위로 입력해주세요.'
    return null
}

function cleanPlayer(p: RotationPoolPlayer): RotationPoolPlayer {
    return {
        name: p.name.trim(),
        ...(p.userId ? { userId: p.userId } : {}),
        ...(p.hand ? { hand: p.hand } : {}),
        ...(p.ntrp != null ? { ntrp: p.ntrp } : {}),
    }
}

/** 세션 저장. listing(리스트에 노출)이 있으면 세션을 경기 리스트의 방으로 등록한다(풀 회원 자동 초대). */
export async function createRotationSessionAction(input: RotationSessionInput, listing?: RoomListingInput): Promise<ActionResult> {
    if (!isDoublesMatchType(input.matchType)) return { error: '로테이션은 복식에서만 등록할 수 있습니다.' }
    if (!input.playedAt) return { error: '경기 날짜를 입력해주세요.' }
    if (!/^\d{2}:\d{2}$/.test(input.playedTime)) return { error: '경기 시각을 입력해주세요.' }
    if (!input.surface) return { error: '코트 표면을 선택해주세요.' }
    const courtNameError = validateCourtName(input.courtName)
    if (courtNameError) return { error: courtNameError }
    // 리스트에 노출(모집형)이면 참가자 없이도 세션을 열 수 있다 — 방에서 모으고 결과 입력 때 게임을 구성한다
    if (!listing && input.players.length < 3) return { error: '참가자를 3명 이상 등록해주세요.' }
    for (const p of input.players) {
        const err = validatePlayer(p)
        if (err) return { error: err }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data: inserted, error } = await supabase.from('rotation_sessions').insert({
        user_id: user.id,
        played_at: input.playedAt,
        played_time: input.playedTime,
        match_type: input.matchType,
        surface: input.surface,
        notes: input.notes?.trim() || null,
        court_name: input.courtName?.trim() || null,
        players: input.players.map(cleanPlayer),
    }).select('id').single()
    if (error || !inserted) return { error: '로테이션 세션 저장에 실패했습니다.' }

    revalidatePath('/me/personal-matches')

    if (listing) {
        const room = await listRecordAsRoom('rotation', inserted.id, listing.password)
        if (room.error) return { error: room.error }
        revalidateRoomList()
    }
    return { error: null }
}

export async function deleteRotationSessionAction(id: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const { data, error } = await supabase
        .from('rotation_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, room_id')
    if (error) return { error: '세션 삭제에 실패했습니다.' }
    if (!data?.length) return { error: '이미 삭제되었거나 존재하지 않는 세션입니다.' }

    // 미확정 세션이 리스트에 올라가 있었다면 방도 내린다. 단 참가자가 이미 올린 게임이 있으면 방을 남긴다 —
    // room_id는 on delete set null이라 방을 지우면 남의 기록에서 방 링크가 조용히 끊긴다(0050).
    const roomId = data[0].room_id
    if (roomId) {
        const { count } = await supabase
            .from('personal_matches')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', roomId)
        if (!count) await supabase.from('match_rooms').delete().eq('id', roomId).eq('host_user_id', user.id)
        revalidateRoomPaths(roomId)
    }

    revalidatePath('/me/personal-matches')
    revalidatePath('/me/match-requests')
    return { error: null }
}

/** RPC가 raise하는 식별자 → 사용자 안내 문구 */
const FINALIZE_ERROR_MESSAGES: Array<[string, string]> = [
    ['not_session_participant', '이 방에 참가한 사람만 결과를 입력할 수 있습니다.'],
    ['participant_not_in_room', '이 방의 참가자만 게임에 넣을 수 있습니다.'],
    ['duplicate_players', '한 게임에 같은 사람을 두 번 넣을 수 없습니다.'],
    ['session_not_found', '게임 입력이 종료되었거나 삭제된 경기입니다.'],
    ['invalid_games', '게임 구성을 확인해주세요. (파트너·상대1·상대2 필수)'],
    ['invalid_set_scores', '게임 스코어를 올바르게 입력해주세요. (게임당 스코어 1줄)'],
]

/**
 * 게임별 기록으로 분해 저장 (RPC 한 트랜잭션).
 * 방 세션이면 방에 참가한 회원 누구나 자기 기준으로 입력할 수 있고, 상대팀에 회원이 있으면
 * 상호 확인 경기로 만들어져 상대 대표 확인 후 확정된다. 세션 행은 방장이 닫을 때까지 남는다(0050).
 */
export async function finalizeRotationSessionAction(
    sessionId: string,
    games: RotationGamePayload[],
): Promise<ActionResult> {
    if (games.length < 1) return { error: '게임을 1개 이상 추가해주세요.' }
    if (games.length > MAX_GAMES) return { error: `게임은 최대 ${MAX_GAMES}개까지 등록할 수 있습니다.` }
    for (const g of games) {
        for (const p of [g.partner, g.opp1, g.opp2]) {
            const err = validatePlayer(p)
            if (err) return { error: err }
        }
        // 게임 1건 = 스코어 1줄 (클라 validateRotationGames·RPC와 3중 방어)
        const setError = validateSetScores(g.sets, { max: 1 })
        if (setError) return { error: setError }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const payload = games.map((g) => ({
        partner: cleanPlayer(g.partner),
        opp1: cleanPlayer(g.opp1),
        opp2: cleanPlayer(g.opp2),
        sets: g.sets.map((s) => ({
            me: s.me,
            opp: s.opp,
            ...(s.myAd ? { myAd: s.myAd } : {}),
            ...(s.oppAd ? { oppAd: s.oppAd } : {}),
        })),
    }))
    // 방 재검증에 쓸 room_id — 세션은 방 참가자도 읽을 수 있다(0050 RLS)
    const { data: session } = await supabase
        .from('rotation_sessions').select('room_id').eq('id', sessionId).maybeSingle()

    const { error } = await supabase.rpc('finalize_rotation_session', {
        p_session_id: sessionId,
        p_games: payload,
    })
    if (error) {
        const known = FINALIZE_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        return { error: known ? known[1] : '게임 저장에 실패했습니다.' }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/personal-matches')
    revalidatePath('/me/analytics')
    revalidatePath('/me/match-requests')
    revalidateRoomPaths(session?.room_id)
    return { error: null }
}
