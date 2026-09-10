import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    /** 이미 저장된 게임 수 — 대진은 덮어쓰지 않고 이어붙이므로 미리 알린다 */
    existingGames: number
    warnings: string[]
    error: string | null
    /** 사람이 대진을 고쳤다 — 옵션을 다시 건드리면 그 편집이 사라진다 */
    isEdited?: boolean
}

/**
 * 대진을 읽기 전에 알아야 할 것들 — 이어붙임 안내 · 편집 안내 · 생성 경고 · 저장 실패.
 *
 * **미리보기 위**에 둔다. "왜 이런 대진이 나왔나"(성별 구성을 못 맞췄다, 인원이 모자라 중단했다)는
 * 결과보다 먼저 읽혀야 하는데, 목록 맨 아래에 있으면 스크롤 끝까지 가야 보인다.
 */
export function RoomLineupNotices({ existingGames, warnings, error, isEdited = false }: Props) {
    if (existingGames === 0 && warnings.length === 0 && !error && !isEdited) return null

    return (
        <div className="space-y-1.5">
            {existingGames > 0 && (
                <p className={`${TYPO.caption} break-keep`}>
                    이미 게임 {existingGames}개가 있습니다. 새 대진은 덮어쓰지 않고 이어서 추가됩니다.
                </p>
            )}
            {isEdited && (
                <p className={`${TYPO.caption} text-spot break-keep`}>
                    대진을 직접 고쳤습니다. 위 옵션을 바꾸거나 [다시 뽑기]를 누르면 새 대진으로 돌아갑니다.
                </p>
            )}
            {warnings.map((w) => (
                <p key={w} className={`${TYPO.caption} text-spot break-keep`}>{w}</p>
            ))}
            {error && <p className={`${TYPO.caption} text-destructive break-keep`}>{error}</p>}
        </div>
    )
}
