import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { MatchRoomSourceKind } from '@/types'

// 세 등록 액션이 출처 저장 후 이 헬퍼로 방을 만든다. 페이로드 타입은 클라이언트 훅과 공유하므로 password.ts(순수)에 둔다.
export type { RoomListingInput } from '@/lib/match-rooms/password'

const CREATE_ROOM_ERROR_MESSAGES: Array<[string, string]> = [
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['already_listed', '이미 경기 리스트에 등록된 기록입니다.'],
    ['source_not_found', '경기 리스트에 등록할 기록을 찾지 못했습니다.'],
]

/**
 * 출처 기록(personal_matches / match_requests / rotation_sessions)을 경기 리스트의 방으로 등록.
 * create_match_room RPC가 출처 행에서 메타·초대 대상·정원을 서버에서 파생하므로 여기서는 id와 비밀번호만 넘긴다.
 * 실패해도 기록 자체는 이미 저장된 상태이므로 에러 문구에 그 사실을 함께 알린다.
 */
export async function listRecordAsRoom(
    kind: MatchRoomSourceKind,
    sourceId: string,
    password: string,
): Promise<{ error: string | null; roomId?: string }> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_match_room', {
        p_source_kind: kind,
        p_source_id: sourceId,
        p_password: password,
    })
    if (error) {
        const known = CREATE_ROOM_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        const detail = known ? ` ${known[1]}` : ''
        return { error: `기록은 저장됐지만 경기 리스트 등록에 실패했습니다.${detail}` }
    }
    return { error: null, roomId: data ?? undefined }
}
