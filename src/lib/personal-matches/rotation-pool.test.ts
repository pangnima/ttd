import { describe, expect, it } from 'vitest'
import type { RotationPoolPlayer } from '@/types'
import { buildBuilderPool, type RoomParticipant } from './rotation-pool'

const host: RoomParticipant = { id: 'host', name: '방장', dominantHand: 'right', ntrp: 3 }
const bob: RoomParticipant = { id: 'bob', name: '밥', dominantHand: 'left', personalNtrp: 3.5, ntrp: 3 }
const me: RoomParticipant = { id: 'me', name: '나', ntrp: 4 }

const pool: RotationPoolPlayer[] = [
    { userId: 'me', name: '나', hand: 'right', ntrp: 4 },
    { userId: 'bob', name: '밥', hand: 'left', ntrp: 3 },
    { name: '인천게스트', hand: 'right', ntrp: 2.5 },
]

describe('buildBuilderPool', () => {
    it('방 참가자를 합치고 뷰어를 제외한다 (세션 소유자는 방 명단에서 합류)', () => {
        const out = buildBuilderPool(pool, [host, bob], 'me')
        expect(out.map((p) => p.name)).toEqual(['밥', '인천게스트', '방장'])
    })

    it('세션 소유자가 뷰어면 방 참가자만 더해진다', () => {
        // 소유자 관점: players에는 자기가 없고, 방 명단에는 자기가 빠져 있다(fetch에서 exclude)
        const owner = buildBuilderPool(pool, [bob], 'host')
        expect(owner.map((p) => p.name)).toEqual(['나', '밥', '인천게스트'])
    })

    it('같은 회원이 풀과 방 명단에 모두 있으면 1행만 남고 세션 값이 우선한다', () => {
        const out = buildBuilderPool(pool, [bob], 'me')
        expect(out.filter((p) => p.userId === 'bob')).toHaveLength(1)
        expect(out.find((p) => p.userId === 'bob')).toMatchObject({ hand: 'left', ntrp: 3 })
    })

    it('풀에 없던 방 참가자는 personalNtrp를 우선해 채운다', () => {
        const out = buildBuilderPool([], [bob], 'me')
        expect(out).toEqual([{ userId: 'bob', name: '밥', hand: 'left', ntrp: 3.5 }])
    })

    it('NTRP가 없는 참가자도 행은 만든다 (빌더에서 입력해 채운다)', () => {
        const out = buildBuilderPool([], [{ id: 'x', name: '엑스' }], 'me')
        expect(out).toEqual([{ userId: 'x', name: '엑스' }])
    })

    it('비회원은 이름으로 중복 제거하고, 이름 없는 빈 행은 버린다', () => {
        const dup: RotationPoolPlayer[] = [{ name: '게스트' }, { name: '게스트' }, { name: '  ' }]
        expect(buildBuilderPool(dup, [], 'me')).toEqual([{ name: '게스트' }])
    })

    it('방 참가자가 없으면(개인 세션) 풀 그대로 — 뷰어만 제외', () => {
        expect(buildBuilderPool(pool, [], 'nobody')).toEqual(pool)
        expect(buildBuilderPool(pool, [me], 'me').some((p) => p.userId === 'me')).toBe(false)
    })
})
