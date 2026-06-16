import { describe, expect, it } from 'vitest'
import type { PersonalMatchSetScore } from '@/types'
import {
    buildRotationInputs,
    rotationGameToInput,
    validateRotation,
    type PoolPlayer,
    type RotationGame,
    type RotationSessionMeta,
} from './rotation'

// 풀 항목 헬퍼 (회원이면 userId, 외부면 name+hand)
function pool(tempId: string, name: string, ntrp: string, userId?: string): PoolPlayer {
    return { tempId, player: { userId, name, hand: userId ? '' : 'right' }, ntrp }
}

function game(tempId: string, partnerRef: string, opp1Ref: string, opp2Ref: string, sets: PersonalMatchSetScore[] = [{ me: 6, opp: 4 }]): RotationGame {
    return { tempId, partnerRef, opp1Ref, opp2Ref, sets }
}

const meta: RotationSessionMeta = {
    playedAt: '2026-06-15',
    playedTime: '18:30',
    matchType: 'men_doubles',
    surface: 'hard',
    notes: '',
}

// 4인 표준 로테이션: 나 + B,C,D
const P = [pool('b', 'B', '3.0'), pool('c', 'C', '3.5'), pool('d', 'D', '4.0')]

describe('rotationGameToInput', () => {
    it('opp1→opponent, opp2→opponent2, partner→partner 슬롯에 매핑', () => {
        const input = rotationGameToInput(meta, game('g1', 'b', 'c', 'd'), P)
        expect(input.partnerName).toBe('B')
        expect(input.opponentName).toBe('C')
        expect(input.opponent2Name).toBe('D')
        expect(input.opponentNtrp).toBe(3.5)
        expect(input.opponent2Ntrp).toBe(4.0)
        expect(input.partnerNtrp).toBe(3.0)
        expect(input.matchType).toBe('men_doubles')
        expect(input.surface).toBe('hard')
        expect(input.playedAt).toBe('2026-06-15')
        expect(input.setScores).toEqual([{ me: 6, opp: 4 }])
    })

    it('외부 선수는 손잡이 저장, 회원은 손잡이 미저장', () => {
        const mixed = [pool('b', 'B', '3.0'), pool('c', 'C', '3.5', 'user-c'), pool('d', 'D', '4.0')]
        const input = rotationGameToInput(meta, game('g1', 'b', 'c', 'd'), mixed)
        expect(input.partnerDominantHand).toBe('right') // 외부
        expect(input.opponentUserId).toBe('user-c')
        expect(input.opponentDominantHand).toBeUndefined() // 회원
    })

    it('NaN 세트 점수는 0으로 정리', () => {
        const input = rotationGameToInput(meta, game('g1', 'b', 'c', 'd', [{ me: NaN, opp: 6 }]), P)
        expect(input.setScores).toEqual([{ me: 0, opp: 6 }])
    })

    it('세트별 애드/듀스(myAd/oppAd)를 보존', () => {
        const input = rotationGameToInput(meta, game('g1', 'b', 'c', 'd', [{ me: 6, opp: 4, myAd: 'partner', oppAd: 'opponent2' }]), P)
        expect(input.setScores).toEqual([{ me: 6, opp: 4, myAd: 'partner', oppAd: 'opponent2' }])
    })
})

describe('buildRotationInputs', () => {
    it('게임 수만큼 PersonalMatchInput 생성 (AB:CD, AC:BD, AD:BC)', () => {
        const games = [
            game('g1', 'b', 'c', 'd'), // 나+B vs C+D
            game('g2', 'c', 'b', 'd'), // 나+C vs B+D
            game('g3', 'd', 'b', 'c'), // 나+D vs B+C
        ]
        const inputs = buildRotationInputs(meta, games, P)
        expect(inputs).toHaveLength(3)
        expect(inputs.map((i) => i.partnerName)).toEqual(['B', 'C', 'D'])
    })
})

describe('validateRotation', () => {
    const games = [game('g1', 'b', 'c', 'd')]

    it('정상 입력은 true', () => {
        expect(validateRotation(P, games, meta)).toBe(true)
    })

    it('풀 3명 미만이면 false', () => {
        expect(validateRotation([pool('b', 'B', '3.0'), pool('c', 'C', '3.5')], games, meta)).toBe(false)
    })

    it('게임이 없으면 false', () => {
        expect(validateRotation(P, [], meta)).toBe(false)
    })

    it('한 게임에 같은 사람 중복이면 false', () => {
        expect(validateRotation(P, [game('g1', 'b', 'b', 'd')], meta)).toBe(false)
    })

    it('상대 NTRP 미입력이면 false', () => {
        const noNtrp = [pool('b', 'B', '3.0'), pool('c', 'C', ''), pool('d', 'D', '4.0')]
        expect(validateRotation(noNtrp, games, meta)).toBe(false)
    })

    it('파트너 NTRP는 선택 — 파트너만 비어도 true', () => {
        const partnerNoNtrp = [pool('b', 'B', ''), pool('c', 'C', '3.5'), pool('d', 'D', '4.0')]
        // g1: partner=b(빈 NTRP), opp=c,d → 통과
        expect(validateRotation(partnerNoNtrp, [game('g1', 'b', 'c', 'd')], meta)).toBe(true)
    })

    it('공통 메타(표면) 누락이면 false', () => {
        expect(validateRotation(P, games, { ...meta, surface: '' })).toBe(false)
    })

    it('0-0 세트면 false', () => {
        expect(validateRotation(P, [game('g1', 'b', 'c', 'd', [{ me: 0, opp: 0 }])], meta)).toBe(false)
    })

    it('미선택 ref(null)이면 false', () => {
        expect(validateRotation(P, [{ tempId: 'g1', partnerRef: 'b', opp1Ref: null, opp2Ref: 'd', sets: [{ me: 6, opp: 4 }] }], meta)).toBe(false)
    })
})
