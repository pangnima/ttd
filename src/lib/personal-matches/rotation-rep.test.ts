import { describe, expect, it } from 'vitest'
import type { RotationPoolPlayer } from '@/types'
import { isImmediateGame, resolveRotationRep } from './rotation-rep'

const member: RotationPoolPlayer = { userId: 'u1', name: '회원1', ntrp: 3 }
const member2: RotationPoolPlayer = { userId: 'u2', name: '회원2', ntrp: 3.5 }
const guest: RotationPoolPlayer = { name: '게스트', hand: 'right', ntrp: 2.5 }
const guest2: RotationPoolPlayer = { name: '게스트2', hand: 'left', ntrp: 2.5 }

describe('resolveRotationRep', () => {
    it('상대1이 회원이면 그대로 대표', () => {
        expect(resolveRotationRep(member, guest)).toEqual({ repUserId: 'u1', opponent2: guest, swapped: false })
    })

    it('상대1이 비회원이고 상대2가 회원이면 슬롯을 스왑한다', () => {
        expect(resolveRotationRep(guest, member2)).toEqual({ repUserId: 'u2', opponent2: guest, swapped: true })
    })

    it('상대 둘 다 회원이면 상대1이 대표 (상대1 → 상대2 순)', () => {
        expect(resolveRotationRep(member, member2)).toMatchObject({ repUserId: 'u1', swapped: false })
    })

    it('상대팀에 회원이 없으면 null — 즉시 확정 대상', () => {
        expect(resolveRotationRep(guest, guest2)).toBeNull()
        expect(isImmediateGame(guest, guest2)).toBe(true)
        expect(isImmediateGame(member, guest)).toBe(false)
    })

    it('슬롯이 비어 있으면 null', () => {
        expect(resolveRotationRep(member, undefined)).toBeNull()
        expect(resolveRotationRep(undefined, member2)).toBeNull()
    })
})
