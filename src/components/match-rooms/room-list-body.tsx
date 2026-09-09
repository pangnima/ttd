import type { RoomListTab, roomListTabMeta } from '@/lib/match-rooms/tabs'
import type { RoomPage } from '@/lib/queries/match-rooms'
import type { RoomTurnSummary } from '@/lib/match-rooms/room-turn'
import { sortByMyTurnFirst } from '@/lib/match-rooms/room-sort'
import { RoomListSection } from '@/components/match-rooms/room-list-section'

type Props = {
    tab: RoomListTab
    meta: ReturnType<typeof roomListTabMeta>
    page: RoomPage
    /** '내가 참여한' 탭의 진행 중 섹션 — 첫 페이지에만 있다 */
    mineUpcoming: RoomPage | null
    turns: Map<string, RoomTurnSummary>
}

/**
 * 탭별 목록 본문 — '내가 참여한'만 진행 중/종료됨 두 덩어리로 나뉜다.
 * 내 차례가 있는 방을 위로 올리는 것은 **첫 페이지 한 장 안에서만** 한다(room-sort.ts 참고).
 */
export function RoomListBody({ tab, meta, page, mineUpcoming, turns }: Props) {
    if (tab !== 'mine') {
        return (
            <RoomListSection
                rooms={page.rooms}
                emptyTitle={meta.emptyTitle}
                emptyHint={meta.emptyHint}
                emptyHref={tab === 'open' ? '/match-rooms/new' : undefined}
                turns={turns}
            />
        )
    }

    const empty = (mineUpcoming?.rooms.length ?? 0) === 0 && page.rooms.length === 0
    if (mineUpcoming && empty) {
        return (
            <RoomListSection rooms={[]} emptyTitle={meta.emptyTitle} emptyHint={meta.emptyHint} emptyHref="/match-rooms" />
        )
    }

    return (
        <>
            {mineUpcoming && (
                <RoomListSection
                    rooms={sortByMyTurnFirst(mineUpcoming.rooms, turns)}
                    title="진행 중"
                    turns={turns}
                />
            )}
            <RoomListSection rooms={page.rooms} title="종료됨" turns={turns} />
        </>
    )
}
