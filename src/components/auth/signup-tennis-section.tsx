'use client'

import { useEffect, useState } from 'react'
import { FieldToggle } from '@/components/common/field-toggle'
import { RacketField } from '@/components/common/racket-field'
import { YearMonthField } from '@/components/common/year-month-field'
import {
    GENDER_OPTIONS,
    HAND_OPTIONS,
    SIGNUP_NTRP_OPTIONS,
    type GenderValue,
    type HandValue,
    type SignupNtrp,
} from '@/lib/profile/signup-fields'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

const GENDERS = GENDER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const HANDS = HAND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
const NTRPS = SIGNUP_NTRP_OPTIONS.map((v) => ({ value: v, label: v }))

type Props = {
    /**
     * 필수 넷(성별·주력손·시작일·NTRP) 중 아직 비어 있는 것이 있는가 — 제출 버튼을 잠글 때 쓴다.
     * `useState`의 setter처럼 **참조가 고정된** 함수를 넘길 것(effect 의존성).
     * 극성이 `missing`인 이유는 부모의 disabled 식이 "나쁜 것들의 OR"이기 때문이다
     * (`NicknameField`의 `onTakenChange`와 같은 관용구).
     */
    onMissingChange?: (missing: boolean) => void
}

/**
 * 회원가입 테니스 정보 섹션 — 성별·주력손·시작일(년/월)·NTRP·주력 라켓.
 * 상태와 hidden input을 자체 소유하므로 부모 폼은 값을 알 필요가 없다.
 * **가입 폼과 소셜 가입자의 프로필 완성 화면이 함께 쓴다** — 새로 만들면 두 경로의 규칙이 갈린다.
 *
 * ⚠ **아무것도 미리 골라 두지 않는다.** 종전에는 남성·오른손·3.0이 기본 선택이라, 손대지 않고
 * 제출해도 그 값이 「변경 불가」로 박혔다. 마이그레이션 0084가 트리거의 `coalesce(…, 3.0)`을
 * 걷어낸 이유가 바로 "고른 적 없는 값이 박히면 불변 정책 때문에 영영 못 고친다"였는데,
 * UI가 그 기본값을 그대로 되살려 두고 있었다. 층만 옮겼을 뿐 결과가 같았다.
 * `FieldToggle`이 `value: T | undefined`를 받아 미선택을 그려 주므로 공용 컴포넌트는 손대지 않는다.
 */
export function SignupTennisSection({ onMissingChange }: Props) {
    const [gender, setGender] = useState<GenderValue | undefined>()
    const [hand, setHand] = useState<HandValue | undefined>()
    const [ntrp, setNtrp] = useState<SignupNtrp | undefined>()
    const [start, setStart] = useState('')

    // 시작일은 값이 있기만 하면 채운 것으로 본다 — 형식 판정은 YearMonthField와 서버가 한다
    const missing = !gender || !hand || !ntrp || start.trim().length === 0
    useEffect(() => {
        onMissingChange?.(missing)
    }, [missing, onMissingChange])

    return (
        <div className="space-y-5">
            {/* 빈 문자열은 서버의 isGenderValue·isHandValue·isSignupNtrp가 거절한다 — 최종 방어선은 그쪽이다 */}
            <input type="hidden" name="gender" value={gender ?? ''} />
            <input type="hidden" name="dominant_hand" value={hand ?? ''} />
            <input type="hidden" name="ntrp" value={ntrp ?? ''} />

            <div className="grid grid-cols-2 gap-3">
                <FieldToggle label="성별" required labelClassName={labelCls} options={GENDERS} value={gender} onChange={setGender} />
                <FieldToggle label="주력손" required labelClassName={labelCls} options={HANDS} value={hand} onChange={setHand} />
            </div>

            <YearMonthField required hint="년/월만 입력합니다 (예: 2022/07)" onValueChange={setStart} />

            <div>
                <FieldToggle label="NTRP" required labelClassName={labelCls} options={NTRPS} value={ntrp} onChange={setNtrp} columns={7} />
                <p className="mt-1 text-caption text-muted-foreground">1.0 ~ 4.0 (0.5 단위) · 가입 후 변경할 수 없습니다</p>
            </div>

            <RacketField />

            {/* 왜 제출이 잠겼는지는 아는 쪽이 말한다 — 부모 둘에 문구를 복제하지 않는다 */}
            {missing && (
                <p className="text-caption text-muted-foreground">
                    성별·주력손·테니스 시작일·NTRP를 모두 채워야 다음으로 넘어갈 수 있습니다.
                </p>
            )}
        </div>
    )
}
