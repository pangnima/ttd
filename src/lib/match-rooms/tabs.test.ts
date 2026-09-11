import { describe, expect, it } from 'vitest'
import {
    MATCH_ROOMS_PATH, MY_ROOMS_PATH, MY_ROOM_TABS, ROOM_LIST_TABS,
    resolveRoomListTab, roomTabHref, roomTabMeta,
} from './tabs'

describe('resolveRoomListTab', () => {
    it('두 탭 키는 그대로 통과한다', () => {
        expect(resolveRoomListTab('open')).toBe('open')
        // 구 2탭·3탭 시절과 값이 같아 외부 링크·뒤로가기가 그대로 동작한다
        expect(resolveRoomListTab('past')).toBe('past')
    })

    it('레거시 값·미지의 값·미지정은 기본 탭으로 떨어진다', () => {
        // 'mine'은 /match-rooms가 /me/match-rooms로 리다이렉트해 여기까지 오지 않지만,
        // 다른 경로로 새어 들어와도 조용히 기본 탭이 되도록 못 박는다
        expect(resolveRoomListTab('mine')).toBe('open')
        expect(resolveRoomListTab('upcoming')).toBe('open')
        expect(resolveRoomListTab('garbage')).toBe('open')
        expect(resolveRoomListTab(undefined)).toBe('open')
        expect(resolveRoomListTab('')).toBe('open')
    })
})

describe('roomTabHref', () => {
    it('기본 탭은 파라미터 없는 경로다 — 첫 진입 URL이 지저분해지지 않게', () => {
        expect(roomTabHref(MATCH_ROOMS_PATH, 'open')).toBe('/match-rooms')
        expect(roomTabHref(MY_ROOMS_PATH, 'open')).toBe('/me/match-rooms')
    })

    it('커서는 탭을 유지한 채 덧붙는다', () => {
        expect(roomTabHref(MATCH_ROOMS_PATH, 'past')).toBe('/match-rooms?tab=past')
        expect(roomTabHref(MY_ROOMS_PATH, 'past', 'c1')).toBe('/me/match-rooms?tab=past&cursor=c1')
        expect(roomTabHref(MY_ROOMS_PATH, 'open', 'c1')).toBe('/me/match-rooms?cursor=c1')
    })

    it('빈 커서는 붙이지 않는다', () => {
        expect(roomTabHref(MATCH_ROOMS_PATH, 'past', null)).toBe('/match-rooms?tab=past')
        expect(roomTabHref(MATCH_ROOMS_PATH, 'open', '')).toBe('/match-rooms')
    })
})

describe('탭 메타', () => {
    it('두 화면 모두 시간 축 2탭이고, 기본 탭 href가 각자의 정규 주소다', () => {
        expect(ROOM_LIST_TABS.map((t) => t.key)).toEqual(['open', 'past'])
        expect(MY_ROOM_TABS.map((t) => t.key)).toEqual(['open', 'past'])
        expect(ROOM_LIST_TABS[0].href).toBe('/match-rooms')
        expect(MY_ROOM_TABS[0].href).toBe('/me/match-rooms')
    })

    it('메타는 키로 찾히고, 종료 탭에는 유도 문구가 없다', () => {
        expect(roomTabMeta(ROOM_LIST_TABS, 'open').label).toBe('진행 중인 경기')
        expect(roomTabMeta(MY_ROOM_TABS, 'open').label).toBe('진행 중')
        expect(roomTabMeta(ROOM_LIST_TABS, 'past').emptyHint).toBeUndefined()
        expect(roomTabMeta(MY_ROOM_TABS, 'past').label).toBe('마무리됨')
        expect(roomTabMeta(MY_ROOM_TABS, 'past').emptyHint).toBeUndefined()
    })

    it('빈 상태 유도는 화면의 목적을 따른다 — 리스트는 만들기로, 내 방은 리스트로', () => {
        expect(roomTabMeta(ROOM_LIST_TABS, 'open').emptyHref).toBe('/match-rooms/new')
        expect(roomTabMeta(MY_ROOM_TABS, 'open').emptyHref).toBe('/match-rooms')
    })
})
