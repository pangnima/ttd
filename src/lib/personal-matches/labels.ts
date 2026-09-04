import type { MatchType } from '@/types'

/**
 * 개인 경기 참가자 라벨 헬퍼 — 카드·결과 입력 Dialog·요청 카드가 공유한다.
 * 단식은 "vs 상대", 복식은 "나 · 파트너 vs 상대1 · 상대2".
 */

export type TeamLabelSource = {
    matchType: MatchType
    opponentName: string
    partnerName?: string
    opponent2Name?: string
}

export type AdLabels = {
    myAdLabels: { me: string; partner: string }
    oppAdLabels: { opponent: string; opponent2: string }
}

export function isDoublesType(matchType: MatchType): boolean {
    return matchType !== 'singles'
}

// 모집형 방(리스트에 노출 + 참가자 미입력)은 이름이 빈 문자열이므로 '미정' 라벨로 대체한다.
const UNSET = { opponent: '상대 미정', opponent1: '상대1 미정', opponent2: '상대2 미정', partner: '파트너 미정' } as const

/** 상대팀 라벨: 단식 "상대", 복식 "상대1 · 상대2" */
export function formatOpponents(m: TeamLabelSource): string {
    if (!isDoublesType(m.matchType)) return m.opponentName.trim() || UNSET.opponent
    return `${m.opponentName.trim() || UNSET.opponent1} · ${m.opponent2Name?.trim() || UNSET.opponent2}`
}

/** 전체 대진 라벨: "vs 상대" / "나 · 파트너 vs 상대1 · 상대2" */
export function formatTeams(m: TeamLabelSource): string {
    if (!isDoublesType(m.matchType)) return `vs ${m.opponentName.trim() || UNSET.opponent}`
    return `나 · ${m.partnerName?.trim() || UNSET.partner} vs ${formatOpponents(m)}`
}

/** 세트별 애드/듀스 토글 라벨 — 단식이면 undefined(토글 미노출) */
export function buildAdLabels(m: TeamLabelSource): AdLabels | undefined {
    if (!isDoublesType(m.matchType)) return undefined
    return {
        myAdLabels: { me: '나', partner: m.partnerName?.trim() || UNSET.partner },
        oppAdLabels: { opponent: m.opponentName.trim() || UNSET.opponent1, opponent2: m.opponent2Name?.trim() || UNSET.opponent2 },
    }
}
