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
 * 하드=블루(cat-1), 클레이=적갈(cat-3), 인조잔디=그린(cat-2), 기타=슬레이트(cat-6), 미지정=뮤트.
 * 카테고리 팔레트라 win/loss 결과 시맨틱과 겹치지 않는다 (docs/color-system.md).
 */
export const SURFACE_BAR_CLASS: Record<string, string> = {
    hard: 'bg-cat-1',
    clay: 'bg-cat-3',
    grass: 'bg-cat-2',
    other: 'bg-cat-6',
    unknown: 'bg-muted-foreground/40',
}

/** 코트 표면별 텍스트 색상 (SURFACE_BAR_CLASS와 동일 슬롯 — 카테고리 토큰은 텍스트·채움 겸용). */
export const SURFACE_TEXT_CLASS: Record<string, string> = {
    hard: 'text-cat-1',
    clay: 'text-cat-3',
    grass: 'text-cat-2',
    other: 'text-cat-6',
    unknown: 'text-muted-foreground',
}

/** 폼 Select에서 사용하는 입력용 옵션 배열 (SURFACE_LABELS과 라벨 일치). */
export const SURFACE_OPTIONS: { value: CourtSurface; label: string }[] = [
    { value: 'hard', label: '하드' },
    { value: 'clay', label: '클레이' },
    { value: 'grass', label: '인조잔디' },
    { value: 'other', label: '기타' },
]
