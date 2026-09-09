import { describe, expect, it } from 'vitest'
import { KICKED_LABEL, canKickRoomMember, canReinviteRoomMember } from './kick'

const HOST = 'h'
const base = { isHost: true, viewerId: HOST, isSettled: false }
const row = (statusLabel: string, userId?: string) => ({ userId, statusLabel })

describe('canKickRoomMember — 방장이 참가자를 내보낼 수 있는가', () => {
    it('방장은 참가·초대 대기 회원을 내보낼 수 있다', () => {
        expect(canKickRoomMember({ ...base, row: row('참가', 'p') })).toBe(true)
        expect(canKickRoomMember({ ...base, row: row('초대 대기', 'i') })).toBe(true)
    })

    it('방장이 아니면 못 한다', () => {
        expect(canKickRoomMember({ ...base, isHost: false, row: row('참가', 'p') })).toBe(false)
    })

    it('자기 자신은 못 내보낸다 — 방을 없애려면 리스트에서 내리기를 쓴다', () => {
        expect(canKickRoomMember({ ...base, row: row('방장', HOST) })).toBe(false)
    })

    it('비회원 행은 멤버 테이블에 없어 대상이 아니다', () => {
        expect(canKickRoomMember({ ...base, row: row('비회원') })).toBe(false)
    })

    it('이미 강퇴된 사람은 대상이 아니다 — 재초대 쪽으로 간다', () => {
        expect(canKickRoomMember({ ...base, row: row(KICKED_LABEL, 'p') })).toBe(false)
    })

    it('정산이 끝난 방에서는 명단을 바꿔도 결과가 달라지지 않는다', () => {
        expect(canKickRoomMember({ ...base, isSettled: true, row: row('참가', 'p') })).toBe(false)
    })
})

describe('canReinviteRoomMember — 강퇴를 되돌리는 유일한 경로', () => {
    it('방장은 강퇴된 회원을 다시 부를 수 있다', () => {
        expect(canReinviteRoomMember({ isHost: true, isSettled: false, row: row(KICKED_LABEL, 'p') })).toBe(true)
    })

    it('참가자는 방장의 결정을 무효화할 수 없다', () => {
        expect(canReinviteRoomMember({ isHost: false, isSettled: false, row: row(KICKED_LABEL, 'p') })).toBe(false)
    })

    it('강퇴 상태가 아니면 재초대 버튼도 없다', () => {
        expect(canReinviteRoomMember({ isHost: true, isSettled: false, row: row('참가', 'p') })).toBe(false)
    })

    it('정산이 끝난 방에서는 막는다', () => {
        expect(canReinviteRoomMember({ isHost: true, isSettled: true, row: row(KICKED_LABEL, 'p') })).toBe(false)
    })
})
