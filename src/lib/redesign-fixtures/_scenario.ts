// 재설계 임시 픽스처 공용 — 화면 단위 "데이터 있음 / 없음" 시나리오 스위치.
// URL 검색 파라미터(`?fixture=empty`)로 전환하며, 실 Supabase 연동 복원 시 파서 호출부와 함께 제거한다.

export type FixtureScenario = 'with-data' | 'empty'

/** `?fixture=` 원시 값 → 시나리오. 'empty'만 빈 상태, 그 외(미지정 포함)는 데이터 있음. */
export function parseFixtureScenario(raw: string | undefined): FixtureScenario {
    return raw === 'empty' ? 'empty' : 'with-data'
}
