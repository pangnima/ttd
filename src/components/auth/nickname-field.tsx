'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import {
    NICKNAME_MAX_LEN,
    NICKNAME_TAKEN_MESSAGE,
    normalizeNickname,
    validateNickname,
} from '@/lib/profile/nickname'

type Props = {
    defaultValue?: string
    /** 프로필 설정에서 본인 행을 중복으로 세지 않기 위해 */
    excludeUserId?: string
    /** 제출 버튼을 잠글 때 쓴다. useState의 setter처럼 **참조가 고정된** 함수를 넘길 것(effect 의존성) */
    onTakenChange?: (taken: boolean) => void
}

/** 조회가 끝난 닉네임과 그 결과. 지금 입력값과 다르면 아직 확인 중이라는 뜻이다. */
type Checked = { nickname: string; taken: boolean }

/**
 * 닉네임 입력 — 타이핑이 멈추면 중복을 물어 필드 아래에서 말한다.
 *
 * 화면 검사는 **편의일 뿐**이고 최종 방어선은 0079의 부분 유니크 인덱스다.
 * 동시 제출은 여기를 통과하고 서버가 다시 잡는다(액션이 한국어로 번역한다).
 * 조회를 RPC로 하는 이유는 가입 화면의 방문자가 `anon`이라 users 직접 select가
 * 에러가 아니라 **빈 결과**로 돌아오기 때문이다(0080 머리말).
 *
 * 상태를 `Checked` 하나만 두고 나머지(확인 중·중복 여부)를 렌더에서 파생하는 이유는,
 * effect 안에서 setState를 연쇄시키지 않기 위해서다 — 파생이면 어긋날 자리가 없다.
 */
export function NicknameField({ defaultValue = '', excludeUserId, onTakenChange }: Props) {
    const [value, setValue] = useState(defaultValue)
    // 처음 들고 있던 값은 물을 것이 없다 — 프로필 설정에서 자기 닉네임은 이미 자기 것이다.
    // 씨앗을 두지 않으면 화면을 열자마자 손대지도 않은 필드가 「확인 중...」을 깜빡인다.
    const [initialNickname] = useState(() => normalizeNickname(defaultValue))
    const [checked, setChecked] = useState<Checked | null>(
        initialNickname.length > 0 ? { nickname: initialNickname, taken: false } : null
    )

    const nickname = normalizeNickname(value)
    const invalidMessage = nickname.length > 0 ? validateNickname(nickname) : null
    const settled = checked?.nickname === nickname
    const checking = nickname.length > 0 && !invalidMessage && !settled
    const taken = Boolean(settled && checked?.taken)

    useEffect(() => {
        if (nickname.length === 0 || validateNickname(nickname)) return
        if (nickname === initialNickname) return

        let alive = true
        const timer = setTimeout(async () => {
            const { data, error } = await createClient().rpc('is_nickname_taken', {
                p_nickname: nickname,
                ...(excludeUserId ? { p_exclude_user_id: excludeUserId } : {}),
            })
            // 조회가 실패하면 막지 않는다 — 판정은 서버가 다시 한다. 잘못 막는 쪽이 더 나쁘다.
            if (!alive || error) return
            setChecked({ nickname, taken: Boolean(data) })
        }, 400)

        return () => {
            alive = false
            clearTimeout(timer)
        }
    }, [nickname, initialNickname, excludeUserId])

    useEffect(() => {
        onTakenChange?.(taken)
    }, [taken, onTakenChange])

    const bad = taken || Boolean(invalidMessage)
    // 처음 값 그대로면 아무 말도 하지 않는다 — 묻지 않았으니 답할 것도 없다.
    const untouched = nickname === initialNickname
    const message =
        invalidMessage ??
        (settled && !untouched ? (taken ? NICKNAME_TAKEN_MESSAGE : '사용 가능한 닉네임입니다.') : null)

    return (
        <div>
            <label htmlFor="nickname" className={labelCls}>닉네임 *</label>
            <input
                id="nickname" name="nickname" placeholder="닉네임" required
                maxLength={NICKNAME_MAX_LEN} autoComplete="nickname"
                value={value} onChange={(e) => setValue(e.target.value)}
                aria-invalid={bad}
                className={inputCls}
            />
            {checking && <p className="mt-1 text-caption text-muted-foreground">확인 중...</p>}
            {message && (
                <p className={`mt-1 text-caption ${bad ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}
