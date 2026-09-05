import { describe, expect, it } from 'vitest'
import { ROOM_LIST_TABS, resolveRoomListTab, roomListTabMeta } from './tabs'

describe('resolveRoomListTab', () => {
    it('세 탭 키는 그대로 통과한다', () => {
        expect(resolveRoomListTab('open')).toBe('open')
        expect(resolveRoomListTab('mine')).toBe('mine')
        // 구 2탭 시절과 값이 같아 외부 링크·뒤로가기가 그대로 동작한다
        expect(resolveRoomListTab('past')).toBe('past')
    })

    it('레거시 upcoming·미지의 값·미지정은 기본 탭으로 떨어진다', () => {
        expect(resolveRoomListTab('upcoming')).toBe('open')
        expect(resolveRoomListTab('garbage')).toBe('open')
        expect(resolveRoomListTab(undefined)).toBe('open')
        expect(resolveRoomListTab('')).toBe('open')
    })
})

describe('ROOM_LIST_TABS', () => {
    it('기본 탭은 파라미터 없는 경로다 — 첫 진입 URL이 지저분해지지 않게', () => {
        expect(ROOM_LIST_TABS[0].key).toBe('open')
        expect(ROOM_LIST_TABS[0].href).toBe('/match-rooms')
    })

    it('탭 메타는 키로 찾히고, 종료 탭에는 유도 문구가 없다', () => {
        expect(roomListTabMeta('mine').label).toBe('내가 참여한 경기')
        expect(roomListTabMeta('past').emptyHint).toBeUndefined()
    })
})
