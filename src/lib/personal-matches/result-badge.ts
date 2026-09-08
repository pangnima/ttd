import type { PersonalMatchSetScore, PersonalMatchWinner } from '@/types'
import {
    PENDING_RESULT_BADGE, PENDING_RESULT_BAR, PENDING_RESULT_LABEL, formatGameSummary,
} from '@/lib/dashboard/outcome'
import { resolveSetWinner, tallySets } from '@/lib/personal-matches/winner'

/**
 * 게임(세트) 스코어 → 결과 배지·색 바·스코어 칩의 단일 출처.
 * 경기 카드와 스코어 칩 패널이 같은 규칙을 두 번 구현하던 것을 여기로 모았다 —
 * 한쪽만 고치면 같은 경기가 화면마다 다른 승패로 보인다.
 *
 * 세트 1개 = 게임 1개. 게임 1개면 WIN/LOSS/무, 2개 이상이면 'N게임 · N승 M패'(다수결 승자는 두지 않는다),
 * 게임이 없으면 미확정.
 */

export type ResultBadge = {
    label: string
    badgeClass: string
    barClass: string   // 카드 좌측 색 바
}

const SINGLE_GAME: Record<PersonalMatchWinner, ResultBadge> = {
    me: { label: 'WIN', badgeClass: 'bg-win text-win-foreground', barClass: 'bg-win-solid' },
    opponent: { label: 'LOSS', badgeClass: 'bg-loss text-loss-foreground', barClass: 'bg-loss-solid' },
    draw: { label: '무', badgeClass: 'bg-muted text-muted-foreground', barClass: 'bg-muted-foreground/40' },
}

/** 결과 미확정 — 게임 스코어 미등록. 통계에 반영되지 않는다. */
export const PENDING_BADGE: ResultBadge = {
    label: PENDING_RESULT_LABEL,
    badgeClass: PENDING_RESULT_BADGE,
    barClass: PENDING_RESULT_BAR,
}

export function resolveResultBadge(sets: PersonalMatchSetScore[]): ResultBadge {
    if (sets.length === 0) return PENDING_BADGE
    if (sets.length === 1) return SINGLE_GAME[resolveSetWinner(sets[0])]
    const t = tallySets(sets)
    return {
        label: formatGameSummary(sets.length, t.wins, t.losses, t.draws),
        badgeClass: 'bg-muted text-muted-foreground',
        // 게임마다 승패가 다르므로 다수결 색을 쓰지 않는다. 다만 미확정(PENDING_RESULT_BAR)과는 구분한다.
        barClass: 'bg-muted-foreground/25',
    }
}

const GAME_CHIP: Record<PersonalMatchWinner, string> = {
    me: 'bg-win/15 text-win',
    opponent: 'bg-loss/15 text-loss',
    draw: 'bg-muted text-muted-foreground',
}

/** 스코어 칩 색 — 게임마다 승/패/무를 따로 판정한다(패와 무를 같은 회색으로 뭉개지 않는다). */
export function gameChipClass(set: PersonalMatchSetScore): string {
    return GAME_CHIP[resolveSetWinner(set)]
}
