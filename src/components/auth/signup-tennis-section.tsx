'use client'

import { useState } from 'react'
import { FieldToggle } from '@/components/common/field-toggle'
import { RacketField } from '@/components/common/racket-field'
import { parseYearMonth } from '@/lib/format/year-month'
import {
    GENDER_OPTIONS,
    HAND_OPTIONS,
    SIGNUP_NTRP_OPTIONS,
    SIGNUP_NTRP_DEFAULT,
    type GenderValue,
    type HandValue,
    type SignupNtrp,
} from '@/lib/profile/signup-fields'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

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
    const [startInput, setStartInput] = useState('')
    const [startTouched, setStartTouched] = useState(false)

    const parsedStart = startInput.trim() ? parseYearMonth(startInput) : null
    const startInvalid = startTouched && startInput.trim().length > 0 && parsedStart === null

    return (
        <div className="space-y-5">
            <input type="hidden" name="gender" value={gender} />
            <input type="hidden" name="dominant_hand" value={hand} />
            <input type="hidden" name="ntrp" value={ntrp} />

            <div className="grid grid-cols-2 gap-3">
                <FieldToggle label="성별" labelClassName={labelCls} options={GENDERS} value={gender} onChange={setGender} />
                <FieldToggle label="주력손" labelClassName={labelCls} options={HANDS} value={hand} onChange={setHand} />
            </div>

            <div>
                <label htmlFor="tennis_start_date" className={labelCls}>테니스 시작일</label>
                <input
                    id="tennis_start_date" name="tennis_start_date"
                    inputMode="numeric" placeholder="예: 2022/07" maxLength={12}
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    onBlur={() => setStartTouched(true)}
                    aria-invalid={startInvalid}
                    className={inputCls}
                />
                {startInvalid ? (
                    <p className="mt-1 text-caption text-destructive">년/월 형식으로 입력해 주세요 (예: 2022/07). 미래 월은 입력할 수 없습니다.</p>
                ) : (
                    <p className="mt-1 text-caption text-muted-foreground">
                        {parsedStart ? `${parsedStart.year}년 ${parsedStart.month}월부터` : '년/월만 입력합니다 (선택)'}
                    </p>
                )}
            </div>

            <div>
                <FieldToggle label="NTRP *" labelClassName={labelCls} options={NTRPS} value={ntrp} onChange={setNtrp} columns={7} />
                <p className="mt-1 text-caption text-muted-foreground">1.0 ~ 4.0 (0.5 단위) · 가입 후 변경할 수 없습니다</p>
            </div>

            <RacketField />
        </div>
    )
}
