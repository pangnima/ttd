import type { PersonalMatch, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'

/**
 * explode가 산출한 게임 1건 — 세트(게임) 1개와 그 세트의 승패(winner)를 가진 가상 경기.
 * 통계·레이팅 경로의 입력 타입. 원본 PersonalMatch에는 행 단위 winner가 없다(0045).
 */
export type SettledPersonalMatch = PersonalMatch & { winner: PersonalMatchWinner }

/** 결과 확정 여부 — 게임(세트) 스코어가 하나라도 있으면 확정. 미확정 판정의 단일 초크포인트. */
export function hasResult(m: PersonalMatch): boolean {
    return m.setScores.length > 0
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
 * 월별 전적·그룹 헤더 배지·스코어 칩 배지가 공유하는 단일 집계 규칙. 다수결 종합 승자는 두지 않는다.
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
