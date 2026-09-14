'use client'

import { useState } from 'react'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'
import { formatPhoneNumber, isValidMobilePhone, PHONE_INVALID_MESSAGE } from '@/lib/format/phone'

type Props = {
    defaultValue?: string
}

/**
 * 휴대폰 번호 입력 — 입력 중 자동 하이픈, 포커스를 뗀 뒤에만 형식 오류를 말한다.
 *
 * 라벨이 '연락처'가 아니라 '휴대폰 번호'인 것 자체가 규칙의 안내다(유선은 받지 않는다).
 * 선택 입력이라 빈 값은 오류가 아니고, 형식 판정은 `lib/format/phone.ts`가 단일 출처다
 * (DB 제약 `users_phone_check`의 거울 — 한쪽만 고치면 화면이 통과시킨 값을 DB가 거부한다).
 */
export function PhoneField({ defaultValue = '' }: Props) {
    const [phone, setPhone] = useState(formatPhoneNumber(defaultValue))
    const [touched, setTouched] = useState(false)

    // 타이핑 도중에는 언제나 '미완성'이라 빨간 글씨가 계속 떠 있게 된다. blur 이후에만 말한다.
    const invalid = touched && phone.length > 0 && !isValidMobilePhone(phone)

    return (
        <div>
            <label htmlFor="phone" className={labelCls}>휴대폰 번호</label>
            <input
                id="phone" name="phone" type="tel" inputMode="numeric"
                placeholder="010-0000-0000" maxLength={13} autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                onBlur={() => setTouched(true)}
                aria-invalid={invalid}
                className={inputCls}
            />
            <p className={`mt-1 text-caption ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>
                {invalid ? PHONE_INVALID_MESSAGE : '선택 입력입니다. 클럽 운영자가 연락할 때 씁니다.'}
            </p>
        </div>
    )
}
