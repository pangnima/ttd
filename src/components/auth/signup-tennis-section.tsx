'use client'

import { useState } from 'react'
import { FieldToggle } from '@/components/common/field-toggle'
import { RacketField } from '@/components/common/racket-field'
import { YearMonthField } from '@/components/common/year-month-field'
import {
    GENDER_OPTIONS,
    HAND_OPTIONS,
    SIGNUP_NTRP_OPTIONS,
    SIGNUP_NTRP_DEFAULT,
    type GenderValue,
    type HandValue,
    type SignupNtrp,
} from '@/lib/profile/signup-fields'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

const GENDERS = GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const HANDS = HAND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const NTRPS = SIGNUP_NTRP_OPTIONS.map((v) => ({ value: v, label: v }))

/**
 * 회원가입 테니스 정보 섹션 — 성별·주력손·시작일(년/월)·NTRP·주력 라켓.
 * 상태와 hidden input을 자체 소유하므로 부모 폼은 값을 알 필요가 없다.
 * 시작일은 controlled로 유지해 서버 검증 에러 후에도 입력이 남는다(React 19 form action 리셋 대응).
 */
export function SignupTennisSection() {
    const [gender, setGender] = useState<GenderValue>('male')
    const [hand, setHand] = useState<HandValue>('right')
    const [ntrp, setNtrp] = useState<SignupNtrp>(SIGNUP_NTRP_DEFAULT)
    return (
        <div className="space-y-5">
            <input type="hidden" name="gender" value={gender} />
            <input type="hidden" name="dominant_hand" value={hand} />
            <input type="hidden" name="ntrp" value={ntrp} />

            <div className="grid grid-cols-2 gap-3">
                <FieldToggle label="성별" labelClassName={labelCls} options={GENDERS} value={gender} onChange={setGender} />
                <FieldToggle label="주력손" labelClassName={labelCls} options={HANDS} value={hand} onChange={setHand} />
            </div>

            <YearMonthField />

            <div>
                <FieldToggle label="NTRP *" labelClassName={labelCls} options={NTRPS} value={ntrp} onChange={setNtrp} columns={7} />
                <p className="mt-1 text-caption text-muted-foreground">1.0 ~ 4.0 (0.5 단위) · 가입 후 변경할 수 없습니다</p>
            </div>

            <RacketField />
        </div>
    )
}
