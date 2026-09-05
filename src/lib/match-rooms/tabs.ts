/**
 * 매칭 리스트 3탭 — 진행 중 / 내가 참여한 / 종료된.
 * 세 탭은 상호배타가 아니다: 내가 참여한 진행 중인 방은 'open'과 'mine'에 모두 나온다.
 * 'mine'은 1·3탭과 교차하는 **관점 필터**라 배타성을 요구하지 않는다(내 경기함 역할).
 */

export type RoomListTab = 'open' | 'mine' | 'past'

export const ROOM_LIST_TABS: { key: RoomListTab; label: string; href: string; emptyTitle: string; emptyHint?: string }[] = [
    {
        key: 'open',
        label: '진행 중인 경기',
        href: '/match-rooms',
        emptyTitle: '진행 중인 경기가 없습니다.',
        emptyHint: '경기를 등록하고 매칭 리스트에 노출해보세요',
    },
    {
        key: 'mine',
        label: '내가 참여한 경기',
        href: '/match-rooms?tab=mine',
        emptyTitle: '참여한 경기가 없습니다.',
        emptyHint: '진행 중인 경기에 입장해보세요',
    },
    {
        key: 'past',
        label: '종료된 경기',
        href: '/match-rooms?tab=past',
        emptyTitle: '종료된 경기가 없습니다.',
    },
]

/**
 * URL의 ?tab= 값 → 탭 키.
 * `past`는 구 2탭 시절과 값이 같아 외부 링크·뒤로가기가 그대로 동작하고,
 * 구 `upcoming`과 알 수 없는 값은 기본 탭(open)으로 떨어진다.
 */
export function resolveRoomListTab(raw?: string): RoomListTab {
    return ROOM_LIST_TABS.some((t) => t.key === raw) ? (raw as RoomListTab) : 'open'
}

export function roomListTabMeta(tab: RoomListTab) {
    return ROOM_LIST_TABS.find((t) => t.key === tab) ?? ROOM_LIST_TABS[0]
}
