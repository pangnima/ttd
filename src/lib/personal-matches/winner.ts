import type { PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

/** 결과가 확정된 개인 경기 — winner가 NULL(미확정)이 아닌 레코드. 통계·레이팅 경로의 입력 타입. */
export type SettledPersonalMatch = PersonalMatch & { winner: PersonalMatchWinner }

export function isSettledPersonalMatch(m: PersonalMatch): m is SettledPersonalMatch {
    return m.winner !== null
}

// 한 세트의 승자 판정 (나 > 상대 = 승, 상대 > 나 = 패, 동점 = 무)
export function resolveSetWinner(set: PersonalMatchSetScore): PersonalMatchWinner {
    if (set.me > set.opp) return 'me'
    if (set.opp > set.me) return 'opponent'
    return 'draw'
}

// 여러 세트(레거시/수정 모드)의 종합 승자 — 세트 승수를 비교한다.
export function resolveMatchWinner(sets: PersonalMatchSetScore[]): PersonalMatchWinner {
    let me = 0
    let opp = 0
    for (const s of sets) {
        const w = resolveSetWinner(s)
        if (w === 'me') me++
        else if (w === 'opponent') opp++
    }
    if (me > opp) return 'me'
    if (opp > me) return 'opponent'
    return 'draw'
}
