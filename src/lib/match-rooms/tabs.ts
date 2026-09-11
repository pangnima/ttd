/**
 * 방 목록의 탭 — **시간 축 하나뿐**이다(진행 중 / 종료된).
 *
 * Week 45 이전에는 여기에 '내가 참여한'이 세 번째 키로 있었다. 그것은 시간 축이 아니라 관계 축이라
 * (`fetchRoomPage`의 filter는 예나 지금이나 'open'|'past' 둘뿐이고 '내가 참여한'은 roomIds 좁히기였다)
 * 같은 방이 두 탭에 겹쳐 나오고, 그 탭만 렌더 규칙이 달랐다. 관계 축은 이제 **라우트가 가른다** —
 * `/match-rooms`(전체) ↔ `/me/match-rooms`(참여 중인 매칭). 두 화면이 이 시간 축을 함께 쓴다.
 */

export type RoomListTab = 'open' | 'past'

/** 두 목록 화면의 기준 경로 — 탭 href·페이저·리다이렉트가 모두 이 상수를 본다 */
export const MATCH_ROOMS_PATH = '/match-rooms'
export const MY_ROOMS_PATH = '/me/match-rooms'

export type RoomTabMeta = {
    key: RoomListTab
    label: string
    href: string
    emptyTitle: string
    emptyHint?: string
    /** 빈 상태 유도 링크 — 문구는 emptyHint */
    emptyHref?: string
}

/**
 * 기준 경로·탭·커서 → URL. 기본 탭은 `?tab=`을 붙이지 않아 기준 경로가 정규 주소로 남고,
 * 커서는 탭을 유지한 채 덧붙는다(페이지를 넘겨도 보던 탭이 바뀌지 않는다).
 */
export function roomTabHref(base: string, tab: RoomListTab, cursor?: string | null): string {
    const params = new URLSearchParams()
    if (tab !== 'open') params.set('tab', tab)
    if (cursor) params.set('cursor', cursor)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
}

/** 매칭 리스트(전체 방) — 고르러 오는 화면이라 빈 상태가 '매칭 만들기'로 민다 */
export const ROOM_LIST_TABS: RoomTabMeta[] = [
    {
        key: 'open',
        label: '진행 중인 경기',
        href: roomTabHref(MATCH_ROOMS_PATH, 'open'),
        emptyTitle: '진행 중인 경기가 없습니다.',
        emptyHint: '경기를 등록하고 매칭 리스트에 노출해보세요',
        emptyHref: '/match-rooms/new',
    },
    {
        key: 'past',
        label: '종료된 경기',
        href: roomTabHref(MATCH_ROOMS_PATH, 'past'),
        emptyTitle: '종료된 경기가 없습니다.',
    },
]

/**
 * 참여 중인 매칭(내 방) — 여기서 진행/종료를 가르는 것은 날짜가 아니라 **정산 여부**다
 * (`RoomListAxis = 'settlement'`). 결과 입력이 남은 방은 경기일이 지나도 내 할 일이라
 * '진행 중'에 남는다 — 그래서 라벨도 '종료된'이 아니라 '마무리됨'이다.
 * 빈 상태는 고르러 갈 곳(매칭 리스트)으로 민다.
 */
export const MY_ROOM_TABS: RoomTabMeta[] = [
    {
        key: 'open',
        label: '진행 중',
        href: roomTabHref(MY_ROOMS_PATH, 'open'),
        emptyTitle: '참여 중인 매칭이 없습니다.',
        emptyHint: '매칭 리스트에서 경기에 입장해보세요',
        emptyHref: MATCH_ROOMS_PATH,
    },
    {
        key: 'past',
        label: '마무리됨',
        href: roomTabHref(MY_ROOMS_PATH, 'past'),
        emptyTitle: '마무리된 매칭이 없습니다.',
    },
]

/**
 * URL의 ?tab= 값 → 탭 키.
 * `past`는 구 2탭·3탭 시절과 값이 같아 외부 링크·뒤로가기가 그대로 동작하고,
 * 구 `upcoming`·`mine`과 알 수 없는 값은 기본 탭(open)으로 떨어진다.
 * ⚠ `mine`은 그 전에 `/match-rooms`가 `/me/match-rooms`로 리다이렉트해 여기까지 오지 않는다 —
 *    이 폴백은 다른 경로로 새어 들어온 값을 위한 안전망이다.
 */
export function resolveRoomListTab(raw?: string): RoomListTab {
    return raw === 'past' ? 'past' : 'open'
}

export function roomTabMeta(tabs: RoomTabMeta[], tab: RoomListTab): RoomTabMeta {
    return tabs.find((t) => t.key === tab) ?? tabs[0]
}
