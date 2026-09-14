'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/** 조회가 끝난 값과 그 결과. 지금 입력값과 다르면 아직 확인 중이라는 뜻이다. */
type Checked = { value: string; taken: boolean }

type Options = {
    /** 판정을 맡길 RPC — 0080 `is_nickname_taken` / 0081 `is_email_taken` */
    rpc: 'is_nickname_taken' | 'is_email_taken'
    /** 정규화된 입력값. 빈 문자열이면 묻지 않는다 */
    value: string
    /** 형식이 틀렸으면 묻지 않는다(문구는 호출부가 이미 들고 있다) */
    skip: boolean
    /** 처음 들고 있던 값 — 프로필 설정에서 자기 닉네임은 물을 것이 없다 */
    initialValue: string
    /** 본인 행을 중복으로 세지 않기 위해(닉네임 전용) */
    excludeUserId?: string
}

export type Availability = {
    /** 묻는 중 */
    checking: boolean
    /** 이미 쓰이고 있다 */
    taken: boolean
    /** 이 값에 대한 답이 나왔다 */
    settled: boolean
}

/**
 * "이 값 써도 되나"를 묻는 debounce 조회 — 닉네임·이메일이 함께 쓴다.
 *
 * 화면 검사는 **편의일 뿐**이고 최종 방어선은 DB다(닉네임은 0079의 부분 유니크 인덱스,
 * 이메일은 `auth.users`). 동시 제출은 여기를 통과하고 서버가 다시 잡는다.
 *
 * 조회를 RPC로 하는 이유는 가입 화면의 방문자가 `anon`이라 users 직접 select가
 * 에러가 아니라 **빈 결과**로 돌아오기 때문이다(0080·0081 머리말).
 *
 * 상태를 `Checked` 하나만 두고 나머지를 파생하는 이유는 effect 안에서 setState를
 * 연쇄시키지 않기 위해서다 — 파생이면 어긋날 자리가 없다.
 */
export function useAvailabilityCheck({
    rpc,
    value,
    skip,
    initialValue,
    excludeUserId,
}: Options): Availability {
    const [checked, setChecked] = useState<Checked | null>(
        initialValue.length > 0 ? { value: initialValue, taken: false } : null
    )

    useEffect(() => {
        if (value.length === 0 || skip || value === initialValue) return

        let alive = true
        const timer = setTimeout(async () => {
            const supabase = createClient()
            const { data, error } =
                rpc === 'is_nickname_taken'
                    ? await supabase.rpc('is_nickname_taken', {
                          p_nickname: value,
                          ...(excludeUserId ? { p_exclude_user_id: excludeUserId } : {}),
                      })
                    : await supabase.rpc('is_email_taken', { p_email: value })
            // 조회가 실패하면 막지 않는다 — 판정은 서버가 다시 한다. 잘못 막는 쪽이 더 나쁘다.
            if (!alive || error) return
            setChecked({ value, taken: Boolean(data) })
        }, 400)

        return () => {
            alive = false
            clearTimeout(timer)
        }
    }, [rpc, value, skip, initialValue, excludeUserId])

    const settled = checked?.value === value
    return {
        settled,
        checking: value.length > 0 && !skip && !settled,
        taken: Boolean(settled && checked?.taken),
    }
}
