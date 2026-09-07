import { describe, expect, it } from 'vitest'
import type { OpponentCandidate } from '@/lib/queries/users'
import { derivePublicNtrp, isNtrpLocked } from './ntrp'

const CANDIDATES: OpponentCandidate[] = [
    { id: 'member-1', name: '회원1', isGuest: false, clubNames: ['A'] },
    { id: 'guest-1', name: '게스트1', isGuest: true, clubNames: ['A'] },
]

const player = (name: string, userId?: string) => ({ userId, name, hand: '' as const })

describe('derivePublicNtrp (DB derive_public_ntrp 미러)', () => {
    it('공개 회원은 동적 개인 NTRP 우선', () => {
        expect(derivePublicNtrp({ ntrp: 3, personalNtrp: 3.42 })).toBe(3.42)
    })

    it('개인 NTRP가 없으면 자가선언 값', () => {
        expect(derivePublicNtrp({ ntrp: 3 })).toBe(3)
    })

    it('통계 비공개 회원은 개인 NTRP를 감추고 자가선언 값만', () => {
        expect(derivePublicNtrp({ ntrp: 3, personalNtrp: 3.42, statsHidden: true })).toBe(3)
    })

    it('통계 비공개 + 자가선언 값도 없으면 없음', () => {
        expect(derivePublicNtrp({ personalNtrp: 3.42, statsHidden: true })).toBeUndefined()
    })

    it('1.0~7.0 밖이면 없음 (personal_matches check 범위)', () => {
        expect(derivePublicNtrp({ personalNtrp: 0.5 })).toBeUndefined()
        expect(derivePublicNtrp({ personalNtrp: 7.5 })).toBeUndefined()
        expect(derivePublicNtrp({ ntrp: 0 })).toBeUndefined()
    })

    it('값이 아예 없으면 없음 (게스트)', () => {
        expect(derivePublicNtrp({})).toBeUndefined()
    })
})

describe('isNtrpLocked', () => {
    it('회원 슬롯 + 값이 있으면 잠금', () => {
        expect(isNtrpLocked(player('회원1', 'member-1'), '3.42', CANDIDATES)).toBe(true)
    })

    it('후보 목록에 없는 userId(전체 회원 검색)도 회원으로 본다', () => {
        expect(isNtrpLocked(player('검색회원', 'search-9'), '4.0', CANDIDATES)).toBe(true)
    })

    it('값이 비어 있으면 잠그지 않는다 — 서버 검증과 어긋나지 않도록 입력을 받는다', () => {
        expect(isNtrpLocked(player('회원1', 'member-1'), '', CANDIDATES)).toBe(false)
        expect(isNtrpLocked(player('회원1', 'member-1'), '   ', CANDIDATES)).toBe(false)
    })

    it('게스트 회원·직접 입력은 잠그지 않는다', () => {
        expect(isNtrpLocked(player('게스트1', 'guest-1'), '2.5', CANDIDATES)).toBe(false)
        expect(isNtrpLocked(player('외부상대'), '2.5', CANDIDATES)).toBe(false)
    })
})
