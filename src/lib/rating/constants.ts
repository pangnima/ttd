// 클럽 동적 레이팅(NTRP 스케일 ELO) 상수.
// 공식·근거는 docs/rating-system.md §2 를 단일 진실로 삼는다.

/** 스케일 계수 D. NTRP 1.0 차이 = 승산 10배. */
export const RATING_SCALE_D = 1.0

/** 잠정기(경기 수 < PROVISIONAL_THRESHOLD) 최대 변동폭. */
export const K_PROVISIONAL = 0.1

/** 정착 후 최대 변동폭. */
export const K_BASE = 0.05

/** 잠정기 경기 수 경계. */
export const PROVISIONAL_THRESHOLD = 10

/** 마진(세트·게임 차) 가중치. marginFactor 범위 [1.0, 1 + MARGIN_WEIGHT]. */
export const MARGIN_WEIGHT = 0.5

/** 클럽 가입 기본 레이팅. */
export const DEFAULT_RATING = 2.5

/** 레이팅 하한/상한. */
export const MIN_RATING = 1.0
export const MAX_RATING = 7.0
