import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { MatchRoomSourceKind } from '@/types'

const CREATE_ROOM_ERROR_MESSAGES: Array<[string, string]> = [
    ['invalid_password', '비밀번호는 4~20자, 공백 없이 입력해주세요.'],
    ['already_listed', '이미 매칭 리스트에 등록된 기록입니다.'],
    ['source_not_found', '매칭 리스트에 등록할 기록을 찾지 못했습니다.'],
]

/** 방 고유 속성 — 출처 기록에는 둘 자리가 없어 RPC 파라미터로 간다 (0073) */
export type RoomScheduleInput = { durationMinutes?: number; courtCount?: number }

/**
 * 출처 기록(personal_matches / match_requests / rotation_sessions)을 매칭 리스트의 방으로 등록.
 * create_match_room RPC가 출처 행에서 메타·초대 대상을 서버에서 파생하므로 여기서는 id와 비밀번호만 넘긴다.
 *
 * 예외가 소요 시간과 코트 면 수다 — 개인 경기 기록에 코트 면 수를 둘 이유가 없어 seed를 거치지 않는다.
 * 생략하면 RPC 기본값(null · 1면)이라 이 함수를 쓰는 다른 경로는 그대로 동작한다.
 *
 * 실패해도 기록 자체는 이미 저장된 상태이므로 에러 문구에 그 사실을 함께 알린다.
 */
export async function listRecordAsRoom(
    kind: MatchRoomSourceKind,
    sourceId: string,
    password: string,
    schedule: RoomScheduleInput = {},
): Promise<{ error: string | null; roomId?: string }> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('create_match_room', {
        p_source_kind: kind,
        p_source_id: sourceId,
        p_password: password,
        ...(schedule.durationMinutes ? { p_duration_minutes: schedule.durationMinutes } : {}),
        ...(schedule.courtCount ? { p_court_count: schedule.courtCount } : {}),
    })
    if (error) {
        const known = CREATE_ROOM_ERROR_MESSAGES.find(([key]) => error.message.includes(key))
        const detail = known ? ` ${known[1]}` : ''
        return { error: `기록은 저장됐지만 매칭 리스트 등록에 실패했습니다.${detail}` }
    }
    return { error: null, roomId: data ?? undefined }
}
