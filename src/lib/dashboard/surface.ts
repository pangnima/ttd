import type { CourtSurface } from '@/types'

/**
 * 코트 표면(surface) 공통 라벨 정의.
 * grass = '인조잔디'로 통일 (한국 테니스 클럽 환경 반영).
 */
export const SURFACE_LABELS: Record<string, string> = {
    hard: '하드',
    clay: '클레이',
    grass: '인조잔디',
    other: '기타',
    unknown: '미지정',
}

/**
 * 코트 표면별 막대 그래프 색상 (실제 코트 색 직관 반영).
 * 하드=블루, 클레이=주황(적갈), 인조잔디=초록, 기타=슬레이트, 미지정=뮤트.
 */
export const SURFACE_BAR_CLASS: Record<string, string> = {
    hard: 'bg-sky-500 dark:bg-sky-400',
    clay: 'bg-orange-500 dark:bg-orange-400',
    grass: 'bg-emerald-500 dark:bg-emerald-400',
    other: 'bg-slate-400 dark:bg-slate-500',
    unknown: 'bg-muted-foreground/40',
}

/** 폼 Select에서 사용하는 입력용 옵션 배열 (SURFACE_LABELS과 라벨 일치). */
export const SURFACE_OPTIONS: { value: CourtSurface; label: string }[] = [
    { value: 'hard', label: '하드' },
    { value: 'clay', label: '클레이' },
    { value: 'grass', label: '인조잔디' },
    { value: 'other', label: '기타' },
]
