import { ATTENTION_PILL, PILL_BASE } from '@/lib/dashboard/tokens'

/**
 * 대진 미리보기의 전력 균형 등급 — 팀 NTRP 합 차이를 눈으로 읽히는 한 마디로 바꾼다.
 *
 * 숫자만 있으면 '전력차 0.4'가 좋은 값인지 알 수 없다. 그래서 등급이 앞에 서고 숫자가 뒤따른다.
 * **승패 색(win/loss)은 쓰지 않는다** — 아직 치지 않은 경기의 예측이지 결과가 아니다(docs/color-system.md §5).
 *
 * 차이는 1인당 값으로 환산해 단식과 복식의 눈금을 통일한다 —
 * 복식의 합 차이 0.4는 1인당 0.2라 단식의 0.4보다 접전이다.
 */

export type LineupBalanceTone = 'even' | 'fair' | 'skewed'

export type LineupBalance = {
    tone: LineupBalanceTone
    label: string
    pillClass: string
}

/** 1인당 NTRP 차가 이 값 이하면 접전 */
export const EVEN_MAX_PER_PLAYER = 0.15
/** 이 값 이하면 무난, 넘으면 차이 큼 */
export const FAIR_MAX_PER_PLAYER = 0.4

const BALANCE: Record<LineupBalanceTone, LineupBalance> = {
    // 보조 정보 = info
    even: { tone: 'even', label: '접전', pillClass: `${PILL_BASE} border-info/40 text-info` },
    fair: { tone: 'fair', label: '무난', pillClass: `${PILL_BASE} border-border text-muted-foreground` },
    // 주의 = spot (기존 토큰 재사용)
    skewed: { tone: 'skewed', label: '차이 큼', pillClass: ATTENTION_PILL },
}

/** 팀 전력 합의 차이 → 등급. teamSize는 한 팀 인원(단식 1·복식 2) */
export function lineupBalance(diff: number, teamSize: number): LineupBalance {
    const perPlayer = Math.abs(diff) / Math.max(teamSize, 1)
    // 값을 못 믿을 때는 등급을 주장하지 않는다
    if (!Number.isFinite(perPlayer)) return BALANCE.fair
    if (perPlayer <= EVEN_MAX_PER_PLAYER) return BALANCE.even
    if (perPlayer <= FAIR_MAX_PER_PLAYER) return BALANCE.fair
    return BALANCE.skewed
}
