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

/** 폼 Select에서 사용하는 입력용 옵션 배열 (SURFACE_LABELS과 라벨 일치). */
export const SURFACE_OPTIONS: { value: CourtSurface; label: string }[] = [
    { value: 'hard', label: '하드' },
    { value: 'clay', label: '클레이' },
    { value: 'grass', label: '인조잔디' },
    { value: 'other', label: '기타' },
]
