'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchPersonalMatchById, fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { isLineupComplete } from '@/lib/personal-matches/lineup'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { roundRating } from '@/lib/rating/elo'
import {
    isDoublesMatchType,
    validatePersonalMatchInput,
    validateSetScores,
    type PersonalMatchInput,
} from '@/lib/personal-matches/validate-input'
import type { PersonalMatchSetScore } from '@/types'
import { revalidateRoomList, revalidateRoomPaths } from '@/lib/match-rooms/revalidate'
import { DIRECT_RECORD_MEMBER_ERROR, requiresRoom } from '@/lib/personal-matches/direct-record'

/**
 * 호스트가 마감한 방(0083)의 기록을 고치거나 지우려 할 때 — RPC·정책의 room_closed와 같은 뜻.
 * match-rooms 액션의 에러 맵(`room_closed`)과 문구를 맞춘다('use server' 파일은 상수를 export할 수 없어 여기 둔다).
 */
const ROOM_CLOSED_ERROR = '호스트가 마감한 매칭입니다. 고치려면 호스트가 다시 열어야 합니다.'

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
        // 표시용 3자리로 반올림해 캐시한다(elo.ts와 같은 규칙). replay의 원값은 배정밀도 부동소수라
        // 그대로 저장하면 `personal_ntrp`를 읽는 모든 곳 — 로테이션 빌더의 선수 라벨, 회원 슬롯의
        // NTRP 입력칸, 요청 수락 시 굳는 `ntrp_snapshot` — 에 3.5379931389096955가 새어 나온다.
        const personalNtrp = snap.matchesPlayed > 0 ? roundRating(snap.rating) : null
        await supabase.from('users').update({ personal_ntrp: personalNtrp }).eq('id', userId)
    } catch {
        // 캐시 갱신 실패는 본 작업 성공에 영향을 주지 않는다.
    }
}

type CreateOptions = {
    // 방 게임 추가(0048·0054) — 방에 참가한 회원이 자기 방 게임을 붙인다.
    // RLS(personal_matches_insert)가 is_room_participant로 입장하지 않은 방을 막는다.
    roomId?: string
}

/**
 * 여러 개인 경기를 일괄 INSERT하는 범용 액션.
 * 신규 등록은 세트 없이 단일 경기 1건(1요소 배열, 결과 미확정)으로, 로테이션은 게임별 다건으로 호출한다.
 * 세트가 없으면 결과 미확정으로 저장되고, 있으면 게임마다 승패가 세트 스코어로 판정된다(행 단위 winner 없음).
 * options.roomId가 있으면 기존 방의 게임으로 저장한다.
 *
 * 방을 만드는 일은 더 이상 여기서 하지 않는다 — 매칭은 createMatchRoomAction이 연다(Week 39).
 */
export async function createPersonalMatchesAction(
    inputs: PersonalMatchInput[],
    options: CreateOptions = {},
): Promise<{ error: string | null }> {
    if (!inputs.length) return { error: '저장할 경기가 없습니다.' }
    for (const input of inputs) {
        const validationError = validatePersonalMatchInput(input)
        if (validationError) return { error: validationError }
        // 방 밖 기록에 회원을 넣을 수 없다(Week 39) — 폼 검증과 같은 술어를 서버에서도 본다.
        // 방 게임(options.roomId)은 이미 참가 동의를 거쳤으므로 예외다.
        if (!options.roomId && requiresRoom([
            { userId: input.opponentUserId },
            { userId: input.partnerUserId },
            { userId: input.opponent2UserId },
        ])) {
            return { error: DIRECT_RECORD_MEMBER_ERROR }
        }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 정산된 방에는 게임을 붙이지 않는다(0077) — 화면(canAddRoomGame)·RLS와 같은 규칙을 먼저 사람 말로 거절한다.
    if (options.roomId) {
        const { data: room } = await supabase.from('match_rooms').select('is_settled').eq('id', options.roomId).maybeSingle()
        if (room?.is_settled) return { error: '이미 게임 입력이 종료된 경기입니다.' }
    }

    const baseRows = inputs.map((input) => ({ ...buildPersonalMatchBaseRow(input, user.id), room_id: options.roomId ?? null }))
    const { data: inserted, error } = await supabase.from('personal_matches').insert(baseRows).select('id')
    if (error || !inserted) return { error: options.roomId ? '매칭 게임 저장에 실패했습니다. 매칭에 참가한 뒤 게임을 추가할 수 있습니다.' : '경기 저장에 실패했습니다.' }

    const participantRows = inputs.flatMap((input, i) => buildParticipantRows(input, inserted[i].id))
    if (participantRows.length > 0) {
        const { error: participantsError } = await supabase.from('personal_match_participants').insert(participantRows)
        if (participantsError) return { error: '경기 저장에 실패했습니다.' }
    }

    await recomputePersonalNtrp(user.id)
    revalidatePath(`/profile/${user.id}`)
    revalidatePath('/me/personal-matches')
    // 신규 등록은 세트가 없어 항상 미확정이다 — 저장 직후 도착하는 화면이 확인 요청 허브다
    revalidateRoomList()

    if (options.roomId) {
        revalidateRoomPaths(options.roomId)
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
        .select('room_id, room:match_rooms!personal_matches_room_id_fkey(closed_at)')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    const roomId = existing?.room_id ?? null
    // 호스트가 마감한 방의 기록은 소유자도 고칠 수 없다(0083) — 정책이 0행으로 거절하기 전에 사람 말로
    if (existing?.room?.closed_at) return { error: ROOM_CLOSED_ERROR }

    const validationError = validatePersonalMatchInput(input, { allowMissingPlayers: !!roomId })
    if (validationError) return { error: validationError }
    // 방 밖 기록에 회원을 붙일 수 없다(Week 39) — 신규(create)만 보던 가드를 수정에도 건다(N-2).
    // 폼은 수정 모드에서 회원 선택을 막지만 서버가 안 보면 그쪽이 곧 우회로다(direct-record.ts).
    if (!roomId && requiresRoom([
        { userId: input.opponentUserId },
        { userId: input.partnerUserId },
        { userId: input.opponent2UserId },
    ])) {
        return { error: DIRECT_RECORD_MEMBER_ERROR }
    }

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
    revalidatePath(`/profile/${user.id}`)
    revalidatePath('/me/personal-matches')
    // 참가자를 채워도 세트가 없으면 여전히 미확정 — 허브 카드가 갱신돼야 한다
    revalidateRoomList()
    if (roomId) revalidateRoomPaths(roomId)
    return { error: null }
}

export async function deletePersonalMatchAction(
    id: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // 호스트가 마감한 방의 기록은 지울 수 없다(0083) — 정책은 0행으로 조용히 거절하므로 먼저 이유를 말한다
    const { data: existing } = await supabase
        .from('personal_matches')
        .select('room:match_rooms!personal_matches_room_id_fkey(closed_at)')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
    if (existing?.room?.closed_at) return { error: ROOM_CLOSED_ERROR }

    // 상호 확인 경기(source_request_id 보유)는 삭제 불가 — RESTRICTIVE RLS와 이중 방어
    // DELETE ... RETURNING으로 room_id를 함께 받는다 — 삭제 후에는 방 소속을 알 방법이 없다
    const { data: deleted, error } = await supabase
        .from('personal_matches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .is('source_request_id', null)
        .select('id, room_id')

    if (error) return { error: '경기 삭제에 실패했습니다.' }
    if (!deleted?.length) return { error: '상호 확인된 경기는 수정·삭제할 수 없습니다.' }

    await recomputePersonalNtrp(user.id)
    revalidatePath(`/profile/${user.id}`)
    revalidatePath('/me/personal-matches')
    revalidateRoomList()
    // cleanup 트리거가 방을 지우거나 정산을 재계산하므로 방 목록·상세도 무효화한다
    revalidateRoomPaths(deleted[0].room_id)
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
    revalidatePath(`/profile/${user.id}`)
    revalidatePath('/me/personal-matches')
    revalidateRoomList()
    // 확정으로 방의 is_settled가 재계산되므로(recompute_match_room_settled) 방 화면도 갱신한다
    revalidateRoomPaths(match.roomId)
    return { error: null }
}
