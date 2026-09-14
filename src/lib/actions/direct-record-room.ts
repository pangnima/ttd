'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { listRecordAsRoom } from '@/lib/match-rooms/create-room'
import { revalidateRoomList } from '@/lib/match-rooms/revalidate'
import { isDoublesMatchType } from '@/lib/personal-matches/validate-input'
import {
    splitDirectPlayers,
    validateDirectRecordRoomInput,
    type DirectRecordRoomInput,
} from '@/lib/personal-matches/direct-record'

/**
 * 직접 기록에 회원이 끼었을 때의 저장 경로 (0082, Week 53) — **비노출 방을 만들고 사람을 부른다.**
 *
 * `createMatchRoomAction`(매칭 만들기)과 골격이 같다: 방식별 seed → create_match_room → direct seed 제거 →
 * 초대. 다른 점은 셋뿐이다 — ① `listed: false`(매칭 리스트에 오르지 않고 비밀번호도 없다),
 * ② 폼이 이미 사람을 알고 있어 회원은 `invite_room_members`로 초대하고 비회원은 `add_room_guest`로
 * 명단에 올린다(비회원은 수락할 계정이 없어 초대가 아니라 등록이다 — 0069), ③ 게임은 여기서 만들지 않는다.
 *
 * 게임을 미리 만들 수 없는 이유: `create_room_game`은 상대가 joined여야 한다(0077 opponent_not_in_room).
 * 초대는 invited일 뿐이라 상대가 수락한 뒤 룸에서 [게임 추가]·[자동 대진표]로 만든다 — 착지 URL의
 * `?notice=direct_room`이 그 다음 손을 말한다.
 *
 * ⚠ 복식(로테이션) seed는 **빈 풀**로 만든다. `players`에 회원을 미리 심으면 0057 트리거가 방 세션 좌석을
 *    accepted로 만들어 초대를 수락하기도 전에 참여 동의가 성립한다. 입장(join_match_room_as_player)이 풀에 넣는다.
 *
 * 방 생성이 실패하면 seed를 지운다. 초대·등록만 실패하면 방은 두고 안내만 돌려준다(룸 안에서 다시 부를 수 있다).
 */
export async function createDirectRecordRoomAction(
    input: DirectRecordRoomInput,
): Promise<{ error: string | null; roomId?: string }> {
    const validationError = validateDirectRecordRoomInput(input)
    if (validationError) return { error: validationError }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    const kind = isDoublesMatchType(input.matchType) ? 'rotation' : 'direct'
    const meta = {
        played_at: input.playedAt,
        played_time: input.playedTime,
        match_type: input.matchType,
        surface: input.surface,
        court_name: input.courtName?.trim() || null,
        notes: input.notes?.trim() || null,
    }

    const seed = kind === 'rotation'
        ? await supabase.from('rotation_sessions')
            .insert({ user_id: user.id, players: [], ...meta }).select('id').single()
        : await supabase.from('personal_matches')
            .insert({ user_id: user.id, source_type: 'direct', set_scores: [], ...meta }).select('id').single()
    if (seed.error || !seed.data) return { error: '매칭을 만들지 못했습니다.' }
    const sourceId = seed.data.id

    const room = await listRecordAsRoom(kind, sourceId, null, {
        durationMinutes: input.durationMinutes,
        courtCount: input.courtCount,
        listed: false,
    })
    if (room.error || !room.roomId) {
        if (kind === 'rotation') await supabase.from('rotation_sessions').delete().eq('id', sourceId)
        else await supabase.from('personal_matches').delete().eq('id', sourceId)
        return { error: '매칭을 만들지 못했습니다. 잠시 후 다시 시도해주세요.' }
    }

    // direct seed는 발판일 뿐이다(createMatchRoomAction과 같은 이유) — room_id를 먼저 끊고 지운다(cleanup 트리거)
    if (kind === 'direct') {
        await supabase.from('personal_matches').update({ room_id: null }).eq('id', sourceId)
        await supabase.from('personal_matches').delete().eq('id', sourceId)
    }

    const { memberIds, guests } = splitDirectPlayers(input.players)
    const failures: string[] = []
    if (memberIds.length > 0) {
        const { error } = await supabase.rpc('invite_room_members', { p_room_id: room.roomId, p_user_ids: memberIds })
        if (error) failures.push('회원 초대')
    }
    for (const g of guests) {
        const { error } = await supabase.rpc('add_room_guest', {
            p_room_id: room.roomId, p_name: g.name, p_hand: g.dominantHand, p_ntrp: g.ntrp,
        })
        if (error) failures.push(`비회원 ${g.name} 등록`)
    }

    revalidateRoomList()
    revalidatePath('/me/personal-matches')
    return {
        error: failures.length > 0 ? `매칭은 만들어졌지만 ${failures.join('·')}에 실패했습니다. 매칭 룸에서 다시 불러주세요.` : null,
        roomId: room.roomId,
    }
}
