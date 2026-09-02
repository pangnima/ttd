'use client'

import { useState } from 'react'
import { FieldToggle } from '@/components/common/field-toggle'
import { RACKET_BRAND_OPTIONS, RACKET_BRAND_MAX_LEN, type RacketBrandChoice } from '@/lib/profile/signup-fields'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 라디오 옵션은 readonly 튜플이라 FieldToggle의 가변 배열 시그니처에 맞춰 복사
const OPTIONS = RACKET_BRAND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

/**
 * 회원가입 주력 라켓 필드 — 프리셋 라디오 + '기타' 선택 시 브랜드명 직접 입력.
 * 선택 항목(초기 미선택). 최종 저장 문자열은 서버(resolveRacketBrand)에서 산출하므로
 * 폼은 racket_choice(코드)와 racket_other(텍스트) 두 값을 그대로 보낸다.
 */
export function RacketBrandField() {
    const [choice, setChoice] = useState<RacketBrandChoice | undefined>(undefined)

    return (
        <div>
            <input type="hidden" name="racket_choice" value={choice ?? ''} />
            <FieldToggle
                label="주력 라켓"
                labelClassName={labelCls}
                options={OPTIONS}
                value={choice}
                onChange={setChoice}
                columns={5}
            />
            {choice === 'other' && (
                <input
                    name="racket_other"
                    placeholder="브랜드명 입력 (예: 프린스)"
                    maxLength={RACKET_BRAND_MAX_LEN}
                    required
                    autoFocus
                    aria-label="기타 라켓 브랜드"
                    className={`${inputCls} mt-2`}
                />
            )}
        </div>
    )
}
