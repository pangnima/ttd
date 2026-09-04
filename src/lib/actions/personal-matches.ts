'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchById, fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { isLineupComplete } from '@/lib/personal-matches/lineup'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import {
    isDoublesMatchType,
    validatePersonalMatchInput,
    validateSetScores,
    type PersonalMatchInput,
} from '@/lib/personal-matches/validate-input'
import type { PersonalMatchSetScore } from '@/types'
import { listRecordAsRoom, type RoomListingInput } from '@/lib/match-rooms/create-room'

/**
 * insert/update 공통: personal_matches 본체 행 (참가자 정보는 buildParticipantRows가 별도 생성).
 */
function buildPersonalMatchBaseRow(input: PersonalMatchInput, userId: string) {
    return {
        user_id: userId,
        source_type: 'direct' as const,
        played_at: input.playedAt,
        played_time: input.playedTime || null,
        match_type: input.matchType,
        surface: input.surface ?? null,
        // 세트 1개 = 게임 1개. 빈 배열 = 결과 미확정. 행 단위 승자 컬럼은 없다(0045).
        set_scores: input.setScores,
        notes: input.notes?.trim() || null,
        court_name: input.courtName?.trim() || null,
    }
}

type ParticipantRow = {
    match_id: string
    role: 'opponent' | 'partner' | 'opponent2'
    user_id: string | null
    name: string
    dominant_hand: 'right' | 'left' | null
    ntrp_snapshot: number | null
}

/**
 * personal_match_participants 행 생성 — 단식은 opponent 1행, 복식은 partner/opponent2까지 최대 3행.
 * 모집형 방(리스트에 노출)은 참가자를 비운 채 저장할 수 있으므로 **이름 또는 회원 연결이 있는 슬롯만** 행을 만든다
 * (빈 name 행을 남기지 않는다 — 목록·라벨·초대가 모두 이름을 전제로 한다).
 */
function buildParticipantRows(input: PersonalMatchInput, matchId: string) {
    const doubles = isDoublesMatchType(input.matchType)
    const rows: ParticipantRow[] = []
    const pushIf = (
        role: ParticipantRow['role'],
        name: string | undefined,
        userId: string | undefined,
        hand: 'right' | 'left' | undefined,
        ntrp: number | undefined,
    ) => {
        const trimmed = name?.trim() ?? ''
        if (!trimmed && !userId) return
        rows.push({
            match_id: matchId,
            role,
            user_id: userId ?? null,
            name: trimmed,
            dominant_hand: hand ?? null,
            ntrp_snapshot: ntrp ?? null,
        })
    }

    pushIf('opponent', input.opponentName, input.opponentUserId, input.opponentDominantHand, input.opponentNtrp)
    if (doubles) {
        pushIf('partner', input.partnerName, input.partnerUserId, input.partnerDominantHand, input.partnerNtrp)
        pushIf('opponent2', input.opponent2Name, input.opponent2UserId, input.opponent2DominantHand, input.opponent2Ntrp)
    }
    return rows
}

/**
 * 그 유저의 개인경기 기반 동적 개인 NTRP를 재계산해 users.personal_ntrp 캐시에 저장한다.
 * 프로필 산출과 동일 경로(explode → replayPersonalRatings)를 쓴다. best-effort — 실패는 무시.
 * RLS상 본인 경기만 읽으므로 본인 캐시만 갱신된다.
 */
export async function recomputePersonalNtrp(userId: string): Promise<void> {
    try {
        const matches = await fetchPersonalMatchesByUser(userId)
        const supabase = await createClient()
        const { data: selfRow } = await supabase.from('users').select('ntrp').eq('id', userId).single()
        const selfNtrp = selfRow?.ntrp ?? null

        // 등록 상대/파트너 회원의 ntrp resolver (fallback②와 파트너 강도 보강용)
        const memberIds = [...new Set(
            matches.flatMap((m) => [m.opponentUserId, m.opponent2UserId, m.partnerUserId])
                .filter((id): id is string => !!id),
        )]
        const ntrpById = new Map<string, number>()
        if (memberIds.length > 0) {
            const { data: members } = await supabase.from('users').select('id, ntrp').in('id', memberIds)
            for (const r of members ?? []) {
                if (r.ntrp != null) ntrpById.set(r.id, r.ntrp)
            }
        }

        const games = explodePersonalMatchSets(matches)
        const snap = replayPersonalRatings(games, selfNtrp, (id) => ntrpById.get(id))
        const personalNtrp = snap.matchesPlayed > 0 ? snap.rating : null
        await supabase.from('users').update({ personal_ntrp: personalNtrp }).eq('id', userId)
    } catch {
        // 캐시 갱신 실패는 본 작업 성공에 영향을 주지 않는다.
    }
}

/**
 * 여러 개인 경기를 일괄 INSERT하는 범용 액션.
 * 신규 등록은 세트 없이 단일 경기 1건(1요소 배열, 결과 미확정)으로, 로테이션은 게임별 다건으로 호출한다.
 * 세트가 없으면 결과 미확정으로 저장되고, 있으면 게임마다 승패가 세트 스코어로 판정된다(행 단위 winner 없음).
 * listing(리스트에 노출)이 있으면 첫 기록을 경기 리스트의 방으로 등록한다(단일 등록 전제, 기록 저장 후 별도 RPC).
 */
export async function createPersonalMatchesAction(
    inputs: PersonalMatchInput[],
    listing?: RoomListingInput,
): Promise<{ error: string | null }> {
    if (!inputs.length) return { error: '저장할 경기가 없습니다.' }
    for (const input of inputs) {
        // 리스트에 노출(모집형)이면 참가자를 비운 채 저장할 수 있다 (세트가 없을 때만 — validate-input이 함께 본다)
        const validationError = validatePersonalMatchInput(input, { allowMissingPlayers: !!listing })
        if (validationError) return { error: validationError }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const baseRows = inputs.map((input) => buildPersonalMatchBaseRow(input, user.id))
    const { data: inserted, error } = await supabase.from('personal_matches').insert(baseRows).select('id')
    if (error || !inserted) return { error: '경기 저장에 실패했습니다.' }

    const participantRows = inputs.flatMap((input, i) => buildParticipantRows(input, inserted[i].id))
    if (participantRows.length > 0) {
        const { error: participantsError } = await supabase.from('personal_match_participants').insert(participantRows)
        if (participantsError) return { error: '경기 저장에 실패했습니다.' }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')

    if (listing) {
        const room = await listRecordAsRoom('direct', inserted[0].id, listing.password)
        if (room.error) return { error: room.error }
        revalidatePath('/match-rooms')
    }
    return { error: null }
}

export async function updatePersonalMatchAction(
    id: string,
    input: PersonalMatchInput,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 리스트에 노출된 기록(모집형)은 참가자를 비운 채 수정할 수 있다. 세트가 있으면 validate-input이 거부한다.
    const { data: existing } = await supabase
        .from('personal_matches')
        .select('room_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    const roomId = existing?.room_id ?? null

    const validationError = validatePersonalMatchInput(input, { allowMissingPlayers: !!roomId })
    if (validationError) return { error: validationError }

    // 상호 확인 경기(source_type='confirmation')는 수정 불가 — RESTRICTIVE RLS와 이중 방어
    const { user_id: _omit, source_type: _omit2, ...baseRow } = buildPersonalMatchBaseRow(input, user.id)
    void _omit
    void _omit2
    const { data: updated, error } = await supabase
        .from('personal_matches')
        .update(baseRow)
        .eq('id', id)
        .eq('user_id', user.id)
        .is('source_request_id', null)
        .select('id')

    if (error) return { error: '경기 수정에 실패했습니다.' }
    if (!updated?.length) return { error: '상호 확인된 경기는 수정·삭제할 수 없습니다.' }

    // 참가자 재작성: 기존 역할별 행을 삭제 후 새로 삽입(부분 upsert보다 단순하고, 카디널리티 변경도 처리됨)
    // 방에 노출된 기록이면 새로 채운 회원이 INSERT 트리거(0047)로 방에 초대된다.
    await supabase.from('personal_match_participants').delete().eq('match_id', id)
    const participantRows = buildParticipantRows(input, id)
    if (participantRows.length > 0) {
        const { error: participantsError } = await supabase.from('personal_match_participants').insert(participantRows)
        if (participantsError) return { error: '경기 수정에 실패했습니다.' }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    if (roomId) {
        revalidatePath('/match-rooms')
        revalidatePath(`/match-rooms/${roomId}`)
    }
    return { error: null }
}

export async function deletePersonalMatchAction(
    id: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 상호 확인 경기(source_request_id 보유)는 삭제 불가 — RESTRICTIVE RLS와 이중 방어
    const { data: deleted, error } = await supabase
        .from('personal_matches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .is('source_request_id', null)
        .select('id')

    if (error) return { error: '경기 삭제에 실패했습니다.' }
    if (!deleted?.length) return { error: '상호 확인된 경기는 수정·삭제할 수 없습니다.' }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    return { error: null }
}

/**
 * 결과 미확정(세트 없음)인 자유 기록에 게임 스코어만 등록해 즉시 확정하는 경량 액션.
 * 상호 확인 경기(source_request_id 보유)는 여기서 다루지 않는다 — actions/match-results.ts의 제안/확인 플로우 전용.
 */
export async function updatePersonalMatchSetsAction(
    id: string,
    sets: PersonalMatchSetScore[],
): Promise<{ error: string | null }> {
    const validationError = validateSetScores(sets)
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 모집 중(참가자 미정)인 기록에는 결과를 넣을 수 없다 — 통계·레이팅은 상대가 정해진 경기만 집계한다
    const match = await fetchPersonalMatchById(id)
    if (!match || match.userId !== user.id) return { error: '경기를 찾을 수 없습니다.' }
    if (!isLineupComplete(match)) return { error: '참가자를 모두 입력한 뒤 결과를 등록할 수 있습니다.' }

    // me/opp + (복식) 세트별 애드/듀스만 저장 — doubles-court 통계가 setScores[].myAd를 읽는다
    const cleanSets = sets.map((s) => ({
        me: s.me,
        opp: s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }))
    const { data: updated, error } = await supabase
        .from('personal_matches')
        .update({ set_scores: cleanSets })
        .eq('id', id)
        .eq('user_id', user.id)
        .is('source_request_id', null)
        .select('id')

    if (error) return { error: '결과 저장에 실패했습니다.' }
    if (!updated?.length) return { error: '상호 확인된 경기는 상대 확인을 거쳐 결과를 등록해야 합니다.' }

    await recomputePersonalNtrp(user.id)
    revalidatePath('/me/analytics')
    revalidatePath('/me/personal-matches')
    return { error: null }
}
