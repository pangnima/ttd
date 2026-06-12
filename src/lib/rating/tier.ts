// 클럽 레이팅 계급(티어) + 티어당 0~100 포인트 환산.
// 내부 저장은 연속 rating(1.0~7.0) 그대로, 표시만 계급으로 밴딩한다. docs/rating-system.md §5.
// 포인트는 기존 ELO rating에서 파생(별도 저장 없음) → rating 하락 시 자동 강등.

import { MIN_RATING, MAX_RATING } from './constants'

export type RatingTier =
    | 'iron'
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'platinum'
    | 'diamond'
    | 'master'
    | 'challenger'

/** 낮은 계급 → 높은 계급 순서. */
export const TIER_ORDER: RatingTier[] = [
    'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'challenger',
]

export const TIER_LABELS: Record<RatingTier, string> = {
    iron: '아이언',
    bronze: '브론즈',
    silver: '실버',
    gold: '골드',
    platinum: '플래티넘',
    diamond: '다이아몬드',
    master: '마스터',
    challenger: '챌린저',
}

// 티어별 배지 스타일(텍스트/배경/테두리). 단색 text-info 대체.
export const TIER_STYLE: Record<RatingTier, string> = {
    iron: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
    bronze: 'text-amber-700 bg-amber-700/10 border-amber-700/30',
    silver: 'text-slate-300 bg-slate-300/10 border-slate-300/40',
    gold: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    platinum: 'text-teal-300 bg-teal-300/10 border-teal-300/40',
    diamond: 'text-sky-400 bg-sky-400/10 border-sky-400/40',
    master: 'text-purple-400 bg-purple-400/10 border-purple-400/40',
    challenger: 'text-red-400 bg-red-400/10 border-red-400/40',
}

// 포인트 글자색(텍스트 전용). 라이트/다크 양쪽 가독 위해 500레벨 채택.
export const TIER_TEXT: Record<RatingTier, string> = {
    iron: 'text-zinc-500',
    bronze: 'text-amber-600',
    silver: 'text-slate-400',
    gold: 'text-yellow-500',
    platinum: 'text-teal-500',
    diamond: 'text-sky-500',
    master: 'text-purple-500',
    challenger: 'text-red-500',
}

/**
 * 계급 구간(폭 0.5 균등, 기본값 2.5 = 골드 하한). min 포함, 다음 계급 min 미만.
 * 아이언 하한 = MIN_RATING(1.0), 챌린저 상한 = MAX_RATING(7.0, 종착).
 * 경계 조정은 이 배열 1곳만 수정한다.
 */
export const TIER_BANDS: { tier: RatingTier; min: number }[] = [
    { tier: 'iron', min: MIN_RATING }, // 1.00
    { tier: 'bronze', min: 1.5 },
    { tier: 'silver', min: 2.0 },
    { tier: 'gold', min: 2.5 },
    { tier: 'platinum', min: 3.0 },
    { tier: 'diamond', min: 3.5 },
    { tier: 'master', min: 4.0 },
    { tier: 'challenger', min: 4.5 },
]

/** 해당 계급 인덱스의 [하한, 상한). 챌린저 상한 = MAX_RATING. */
function bandRange(index: number): { low: number; high: number } {
    const low = TIER_BANDS[index].min
    const high = index + 1 < TIER_BANDS.length ? TIER_BANDS[index + 1].min : MAX_RATING
    return { low, high }
}

/** rating → 계급 인덱스 (0=아이언). */
function tierIndex(rating: number): number {
    let idx = 0
    for (let i = 0; i < TIER_BANDS.length; i++) {
        if (rating >= TIER_BANDS[i].min) idx = i
        else break
    }
    return idx
}

/** rating → 계급. */
export function getTier(rating: number): RatingTier {
    return TIER_BANDS[tierIndex(rating)].tier
}

/** 계급의 rating 구간 [low, high). 챌린저 high = MAX_RATING. 검증 페이지 표시용. */
export function getTierRange(tier: RatingTier): { low: number; high: number } {
    return bandRange(TIER_ORDER.indexOf(tier))
}

/** 계급 아이콘 정적 경로. 교체 시 public/tiers/{tier}.svg 만 갈아끼우면 됨. */
export function tierIconSrc(tier: RatingTier): string {
    return `/tiers/${tier}.svg`
}

/** 다음(상위) 계급. 챌린저(종착)는 null. "다음 등급까지 N P" 표기용. */
export function getNextTier(tier: RatingTier): RatingTier | null {
    const i = TIER_ORDER.indexOf(tier)
    return i >= 0 && i + 1 < TIER_ORDER.length ? TIER_ORDER[i + 1] : null
}

export type TierProgress = {
    tier: RatingTier
    /** 구간 내 진행도 0~99 (정수). 100 도달은 곧 다음 계급 0p(승급). */
    points: number
    /** 승급까지 남은 포인트 (100 - points). 챌린저는 종착이라 0. */
    pointsToPromote: number
}

/** rating → 계급 + 구간 내 0~99 포인트. */
export function getTierProgress(rating: number): TierProgress {
    const idx = tierIndex(rating)
    const tier = TIER_BANDS[idx].tier
    const { low, high } = bandRange(idx)
    const ratio = (rating - low) / (high - low)
    // round 사용(부동소수점 floor 아티팩트 방지). 상한은 99로 클램프 → 100 도달은 곧 승급.
    const points = Math.min(Math.max(Math.round(ratio * 100), 0), 99)
    const isTerminal = idx === TIER_BANDS.length - 1
    return { tier, points, pointsToPromote: isTerminal ? 0 : 100 - points }
}

export type TierDelta = {
    fromTier: RatingTier
    toTier: RatingTier
    /** 동일 계급 내 포인트 변화(정수). 계급이 바뀐 경우 부호만 의미. */
    pointDelta: number
    promoted: boolean
    demoted: boolean
}

/**
 * 경기 전/후 rating → 계급·포인트 변동.
 * 계급 변동 시 pointDelta(99→0 같은 음수 표기)는 신뢰할 수 없으므로 promoted/demoted로 판단한다.
 */
export function getTierDelta(before: number, after: number): TierDelta {
    const a = getTierProgress(before)
    const b = getTierProgress(after)
    const fromIdx = TIER_ORDER.indexOf(a.tier)
    const toIdx = TIER_ORDER.indexOf(b.tier)
    return {
        fromTier: a.tier,
        toTier: b.tier,
        pointDelta: b.points - a.points,
        promoted: toIdx > fromIdx,
        demoted: toIdx < fromIdx,
    }
}
