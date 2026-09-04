import { describe, expect, it } from 'vitest'
import type { PersonalMatchSetScore } from '@/types'
import {
    buildRotationInputs,
    compactPool,
    rotationGameToInput,
    validateRotation,
    validateRotationGames,
    validateRotationPool,
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
    courtName: '',
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

    it('파트너 NTRP도 필수 — 파트너만 비어도 false', () => {
        const partnerNoNtrp = [pool('b', 'B', ''), pool('c', 'C', '3.5'), pool('d', 'D', '4.0')]
        // g1: partner=b(빈 NTRP), opp=c,d → 풀 단계·게임 단계 모두 거부
        expect(validateRotationPool(partnerNoNtrp, meta)).toBe(false)
        expect(validateRotationGames(partnerNoNtrp, [game('g1', 'b', 'c', 'd')])).toBe(false)
        expect(validateRotation(partnerNoNtrp, [game('g1', 'b', 'c', 'd')], meta)).toBe(false)
    })

    it('풀 전원 NTRP가 있으면 풀 단계 통과, 코트명은 선택', () => {
        expect(validateRotationPool(P, meta)).toBe(true)
        expect(validateRotationPool(P, { ...meta, courtName: '올림픽공원 3번' })).toBe(true)
    })

    it('코트명은 게임 입력으로 전파된다', () => {
        const input = rotationGameToInput({ ...meta, courtName: '올림픽공원 3번' }, game('g1', 'b', 'c', 'd'), P)
        expect(input.courtName).toBe('올림픽공원 3번')
        expect(rotationGameToInput(meta, game('g1', 'b', 'c', 'd'), P).courtName).toBeUndefined()
    })

    it('공통 메타(표면) 누락이면 false', () => {
        expect(validateRotation(P, games, { ...meta, surface: '' })).toBe(false)
    })

    it('0-0 세트면 false', () => {
        expect(validateRotation(P, [game('g1', 'b', 'c', 'd', [{ me: 0, opp: 0 }])], meta)).toBe(false)
    })

    it('게임 1건 = 스코어 1줄 — 세트가 2개면 false, 0개도 false', () => {
        expect(validateRotationGames(P, [game('g1', 'b', 'c', 'd', [{ me: 6, opp: 4 }, { me: 4, opp: 6 }])])).toBe(false)
        expect(validateRotationGames(P, [game('g1', 'b', 'c', 'd', [])])).toBe(false)
        expect(validateRotationGames(P, [game('g1', 'b', 'c', 'd')])).toBe(true)
    })

    it('미선택 ref(null)이면 false', () => {
        expect(validateRotation(P, [{ tempId: 'g1', partnerRef: 'b', opp1Ref: null, opp2Ref: 'd', sets: [{ me: 6, opp: 4 }] }], meta)).toBe(false)
    })
})

describe('모집형(리스트에 노출) — 풀 비우기 허용', () => {
    const empty = (id: string): PoolPlayer => ({ tempId: id, player: { name: '', hand: '' }, ntrp: '' })

    it('allowEmpty면 빈 행 3개(등록 폼 기본 상태)도 통과', () => {
        expect(validateRotationPool([empty('a'), empty('b'), empty('c')], meta, { allowEmpty: true })).toBe(true)
        expect(validateRotationPool([], meta, { allowEmpty: true })).toBe(true)
    })

    it('allowEmpty여도 부분 입력 행이 있으면 거부', () => {
        const partial = [empty('a'), pool('b', 'B', '')]
        expect(validateRotationPool(partial, meta, { allowEmpty: true })).toBe(false)
    })

    it('allowEmpty + 완성된 행 1개는 통과(최소 인원 요구 없음)', () => {
        expect(validateRotationPool([empty('a'), pool('b', 'B', '3.0')], meta, { allowEmpty: true })).toBe(true)
    })

    it('옵션이 없으면 기존대로 3명 미만 거부', () => {
        expect(validateRotationPool([pool('b', 'B', '3.0')], meta)).toBe(false)
        expect(validateRotationPool([empty('a'), empty('b'), empty('c')], meta)).toBe(false)
    })

    it('compactPool은 빈 행만 제거한다', () => {
        expect(compactPool([empty('a'), pool('b', 'B', '3.0'), empty('c')]).map((p) => p.tempId)).toEqual(['b'])
    })

    it('메타가 비면 allowEmpty여도 거부', () => {
        expect(validateRotationPool([], { ...meta, surface: '' }, { allowEmpty: true })).toBe(false)
    })
})
