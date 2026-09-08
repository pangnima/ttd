import { describe, expect, it } from 'vitest'
import { resolveGameWinner, resolveInputWinner } from './match-view-helpers'

describe('resolveGameWinner — 대진표는 경기 1건 = 게임 1개', () => {
    it('점수 비교로 승자를 정한다', () => {
        expect(resolveGameWinner({ team1: 6, team2: 4 })).toBe('team1')
        expect(resolveGameWinner({ team1: 4, team2: 6 })).toBe('team2')
        expect(resolveGameWinner({ team1: 6, team2: 6 })).toBe('draw')
    })
})

describe('resolveInputWinner — 폼 입력 한 줄', () => {
    it('양쪽 모두 비어 있으면 미입력(null)', () => {
        expect(resolveInputWinner({ team1: '', team2: '' })).toBeNull()
        expect(resolveInputWinner(undefined)).toBeNull()
    })

    it('한쪽만 비면 0으로 본다', () => {
        expect(resolveInputWinner({ team1: '6', team2: '' })).toBe('team1')
        expect(resolveInputWinner({ team1: '', team2: '3' })).toBe('team2')
    })

    it('세트 다수결이 아니라 그 게임의 점수로만 판정한다', () => {
        // 6-7이면 졌다. 예전 다수결 구현도 같은 결과였지만, 규칙의 근거가 '게임 하나의 점수'로 바뀌었다.
        expect(resolveInputWinner({ team1: '6', team2: '7' })).toBe('team2')
        expect(resolveInputWinner({ team1: '0', team2: '0' })).toBe('draw')
    })
})
