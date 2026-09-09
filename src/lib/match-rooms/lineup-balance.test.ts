import { describe, expect, it } from 'vitest'
import {
    EVEN_MAX_PER_PLAYER,
    FAIR_MAX_PER_PLAYER,
    lineupBalance,
} from './lineup-balance'

describe('lineupBalance — 전력차 숫자를 등급으로', () => {
    it('차이가 없으면 접전', () => {
        expect(lineupBalance(0, 2).tone).toBe('even')
    })

    it('경계값은 아래 등급에 포함된다 — 접전/무난', () => {
        // 복식이라 1인당 = 합 / 2
        expect(lineupBalance(EVEN_MAX_PER_PLAYER * 2, 2).tone).toBe('even')
        expect(lineupBalance(EVEN_MAX_PER_PLAYER * 2 + 0.01, 2).tone).toBe('fair')
    })

    it('경계값은 아래 등급에 포함된다 — 무난/차이 큼', () => {
        expect(lineupBalance(FAIR_MAX_PER_PLAYER * 2, 2).tone).toBe('fair')
        expect(lineupBalance(FAIR_MAX_PER_PLAYER * 2 + 0.01, 2).tone).toBe('skewed')
    })

    it('단식과 복식의 눈금이 통일된다 — 같은 합 차이라도 복식이 더 접전이다', () => {
        // 합 0.4: 단식은 1인당 0.4(무난), 복식은 1인당 0.2(무난이지만 단식보다 가볍다)
        expect(lineupBalance(0.4, 1).tone).toBe('fair')
        expect(lineupBalance(0.3, 2).tone).toBe('even')
        expect(lineupBalance(0.3, 1).tone).toBe('fair')
    })

    it('부호는 보지 않는다 — 어느 팀이 센지가 아니라 얼마나 벌어졌는지다', () => {
        expect(lineupBalance(-1.2, 2)).toEqual(lineupBalance(1.2, 2))
    })

    it('teamSize 0은 1로 취급해 0으로 나누지 않는다', () => {
        expect(lineupBalance(1.0, 0).tone).toBe('skewed')
    })

    it('값을 못 믿으면 등급을 주장하지 않는다', () => {
        expect(lineupBalance(Number.NaN, 2).tone).toBe('fair')
        expect(lineupBalance(Number.POSITIVE_INFINITY, 2).tone).toBe('fair')
    })

    it('승패 색을 빌려 쓰지 않는다 — 아직 결과가 없는 대진이다', () => {
        for (const diff of [0, 0.5, 3.0]) {
            expect(lineupBalance(diff, 2).pillClass).not.toMatch(/win|loss/)
        }
    })
})
