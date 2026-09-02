import { describe, expect, it } from 'vitest'
import type { OpponentCandidate } from '@/lib/queries/users'
import { resolveConfirmRep } from './confirm-flow'

const CANDIDATES: OpponentCandidate[] = [
    { id: 'member-1', name: '회원1', isGuest: false, clubNames: ['A'] },
    { id: 'guest-1', name: '게스트1', isGuest: true, clubNames: ['A'] },
]

type P = { userId?: string; name: string; ntrp: string }
const p = (name: string, userId?: string, ntrp = ''): P => ({ userId, name, ntrp })

describe('resolveConfirmRep', () => {
    it('상대1이 회원이면 그대로 대표', () => {
        const rep = resolveConfirmRep(p('A', 'member-1', '3.0'), p('B'), CANDIDATES, true)
        expect(rep).toMatchObject({ repUserId: 'member-1', swapped: false })
        expect(rep?.opponent.name).toBe('A')
        expect(rep?.opponent2.name).toBe('B')
    })

    it('복식에서 상대2만 회원이면 슬롯을 스왑해 대표로 (NTRP 등 동반 필드 함께 이동)', () => {
        const rep = resolveConfirmRep(p('A', undefined, '2.5'), p('B', 'search-9', '4.0'), CANDIDATES, true)
        expect(rep).toMatchObject({ repUserId: 'search-9', swapped: true })
        expect(rep?.opponent).toEqual(p('B', 'search-9', '4.0'))
        expect(rep?.opponent2).toEqual(p('A', undefined, '2.5'))
    })

    it('게스트 회원·비회원만 있으면 null (자유 기록)', () => {
        expect(resolveConfirmRep(p('A', 'guest-1'), p('B'), CANDIDATES, true)).toBeNull()
        expect(resolveConfirmRep(p('A'), p('B'), CANDIDATES, true)).toBeNull()
    })

    it('단식은 상대2를 보지 않는다', () => {
        expect(resolveConfirmRep(p('A'), p('B', 'member-1'), CANDIDATES, false)).toBeNull()
    })
})
