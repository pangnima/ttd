'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore, PersonalMatchWinner } from '@/types'
import { isSetValid } from '@/lib/personal-matches/validators'
import { resolveMatchWinner } from '@/lib/personal-matches/winner'

export const MAX_SETS = 5

// 빈 세트 행 — NaN은 입력란을 비워 두기 위한 표시값(SetScoreRow가 ''로 렌더)
const EMPTY_SET: PersonalMatchSetScore = { me: NaN, opp: NaN }

function withAd(s: PersonalMatchSetScore): PersonalMatchSetScore {
    return {
        me: s.me,
        opp: s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }
}

/**
 * 결과 등록 Dialog의 세트 스코어 state + 핸들러 (0034에서 등록 폼에서 제거된 로직을 훅으로 복원).
 * 빈 값은 NaN으로 보관해 한 자리 숫자를 지울 수 있게 하고, 제출 시 cleanSets()로 me/opp(+복식 애드)만 남긴다.
 */
export function useSetScores(initial?: PersonalMatchSetScore[]) {
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initial?.length ? initial.map(withAd) : [EMPTY_SET],
    )

    function addSet() {
        setSets((prev) => (prev.length >= MAX_SETS ? prev : [...prev, EMPTY_SET]))
    }
    function removeSet(i: number) {
        setSets((prev) => prev.filter((_, idx) => idx !== i))
    }
    function updateSet(i: number, field: 'me' | 'opp', val: string) {
        if (val === '') {
            setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: NaN } : s)))
            return
        }
        const num = parseInt(val, 10)
        if (isNaN(num) || num < 0 || num > 99) return
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: num } : s)))
    }
    // 세트별 애드/듀스 (복식). undefined = 미지정(둘 다 듀스).
    function setMyAd(i: number, v: 'me' | 'partner' | undefined) {
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, myAd: v } : s)))
    }
    function setOppAd(i: number, v: 'opponent' | 'opponent2' | undefined) {
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, oppAd: v } : s)))
    }

    const isValid = sets.length > 0 && sets.length <= MAX_SETS && sets.every(isSetValid)
    // 승자 미리보기 — 유효할 때만 (resolveMatchWinner([])는 'draw'를 돌려주므로 가드)
    const previewWinner: PersonalMatchWinner | null = isValid ? resolveMatchWinner(sets) : null

    function cleanSets(): PersonalMatchSetScore[] {
        return sets.map((s) => withAd({ ...s, me: Number.isNaN(s.me) ? 0 : s.me, opp: Number.isNaN(s.opp) ? 0 : s.opp }))
    }

    return {
        sets, addSet, removeSet, updateSet, setMyAd, setOppAd,
        isValid, previewWinner, cleanSets, canAdd: sets.length < MAX_SETS,
    }
}
