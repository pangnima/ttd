'use client'

import { useState } from 'react'
import { FieldToggle } from '@/components/common/field-toggle'
import {
    RACKET_BRAND_OPTIONS,
    RACKET_BRAND_MAX_LEN,
    RACKET_MODEL_MAX_LEN,
    splitRacketBrand,
    type RacketBrandChoice,
} from '@/lib/profile/signup-fields'
import { FORM_INPUT_BASE as inputCls, FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

// 라디오 옵션은 readonly 튜플이라 FieldToggle의 가변 배열 시그니처에 맞춰 복사
const OPTIONS = RACKET_BRAND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

type RacketFieldProps = {
    // 편집 폼 초기값 (users.racket_brand / racket_model 저장값). 가입 폼은 생략
    initialBrand?: string | null
    initialModel?: string | null
}

/**
 * 주력 라켓 필드 — 브랜드 라디오 + '기타' 브랜드명 입력 + 라켓명(모델, 선택) 입력.
 * 회원가입·프로필 설정에서 공유. 최종 저장 문자열은 서버(resolveRacketBrand·normalizeRacketModel)에서
 * 산출하므로 폼은 racket_choice / racket_other / racket_model 세 값을 그대로 보낸다.
 * 선택 항목(초기 미선택 허용). 브랜드를 고르면 라켓명 입력이 나타난다.
 */
export function RacketField({ initialBrand, initialModel }: RacketFieldProps) {
    const initial = splitRacketBrand(initialBrand)
    const [choice, setChoice] = useState<RacketBrandChoice | undefined>(initial.choice)

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
            {choice && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {choice === 'other' && (
                        <input
                            name="racket_other"
                            defaultValue={initial.otherText}
                            placeholder="브랜드명 입력 (예: 프린스)"
                            maxLength={RACKET_BRAND_MAX_LEN}
                            required
                            aria-label="기타 라켓 브랜드"
                            className={inputCls}
                        />
                    )}
                    <input
                        name="racket_model"
                        defaultValue={initialModel ?? ''}
                        placeholder="라켓명 (선택, 예: 프로스태프 97)"
                        maxLength={RACKET_MODEL_MAX_LEN}
                        aria-label="라켓명"
                        className={`${inputCls} ${choice === 'other' ? '' : 'sm:col-span-2'}`}
                    />
                </div>
            )}
        </div>
    )
}
