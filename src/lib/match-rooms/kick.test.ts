import { describe, expect, it } from 'vitest'
import { canKickRoomMember, canRemoveRoomGuest } from './kick'

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

    it('내보낸 사람은 명단에서 사라지므로 대상이 아니다 — 되돌리는 길은 [회원 초대]다', () => {
        expect(canKickRoomMember({ ...base, row: row('강퇴됨', 'p') })).toBe(false)
    })

    it('정산이 끝난 방에서는 명단을 바꿔도 결과가 달라지지 않는다', () => {
        expect(canKickRoomMember({ ...base, isSettled: true, row: row('참가', 'p') })).toBe(false)
    })
})


describe('canRemoveRoomGuest — 방에 등록된 비회원 빼기 (0069)', () => {
    const guestRow = { guestId: 'g1', guestCreatedBy: 'p' }

    it('방장은 누가 부른 게스트든 뺄 수 있다', () => {
        expect(canRemoveRoomGuest({ isHost: true, isSettled: false, viewerId: 'h', row: guestRow })).toBe(true)
    })

    it('내가 부른 게스트는 방장이 아니어도 뺀다 — 잘못 부른 것을 되돌릴 경로', () => {
        expect(canRemoveRoomGuest({ isHost: false, isSettled: false, viewerId: 'p', row: guestRow })).toBe(true)
    })

    it('남이 부른 게스트는 방장만', () => {
        expect(canRemoveRoomGuest({ isHost: false, isSettled: false, viewerId: 'x', row: guestRow })).toBe(false)
    })

    it('파생 비회원 행(등록되지 않은 이름)에는 빼기가 없다', () => {
        expect(canRemoveRoomGuest({ isHost: true, isSettled: false, viewerId: 'h', row: {} })).toBe(false)
    })

    it('정산이 끝난 방에서는 막는다', () => {
        expect(canRemoveRoomGuest({ isHost: true, isSettled: true, viewerId: 'h', row: guestRow })).toBe(false)
    })
})
