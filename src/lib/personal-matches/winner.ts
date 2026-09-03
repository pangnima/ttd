import type { PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

/** 결과가 확정된 개인 경기 — winner가 NULL(미확정)이 아닌 레코드. 통계·레이팅 경로의 입력 타입. */
export type SettledPersonalMatch = PersonalMatch & { winner: PersonalMatchWinner }

export function isSettledPersonalMatch(m: PersonalMatch): m is SettledPersonalMatch {
    return m.winner !== null
}

// 한 세트(=동호인 게임 1개)의 승자 판정 (나 > 상대 = 승, 상대 > 나 = 패, 동점 = 무)
export function resolveSetWinner(set: PersonalMatchSetScore): PersonalMatchWinner {
    if (set.me > set.opp) return 'me'
    if (set.opp > set.me) return 'opponent'
    return 'draw'
}

export type SetTally = { wins: number; losses: number; draws: number }

/**
 * 세트(게임) 배열의 승/패/무 집계 — 세트 1개 = 게임 1개.
 * 월별 전적·그룹 카드 배지·스코어 칩 배지가 공유하는 단일 집계 규칙.
 */
export function tallySets(sets: PersonalMatchSetScore[]): SetTally {
    const t: SetTally = { wins: 0, losses: 0, draws: 0 }
    for (const s of sets) {
        const w = resolveSetWinner(s)
        if (w === 'me') t.wins++
        else if (w === 'opponent') t.losses++
        else t.draws++
    }
    return t
}

// 여러 세트의 종합 승자 — 세트 승수를 비교한다.
// DB personal_match_winner와 동일 규칙. 저장 시 winner 파생(결과 확정 여부 판정용)에만 쓰고, 화면은 게임(세트)마다 승패를 표시한다.
export function resolveMatchWinner(sets: PersonalMatchSetScore[]): PersonalMatchWinner {
    const t = tallySets(sets)
    if (t.wins > t.losses) return 'me'
    if (t.losses > t.wins) return 'opponent'
    return 'draw'
}
