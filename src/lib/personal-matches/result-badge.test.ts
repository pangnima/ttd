import { describe, expect, it } from 'vitest'
import { gameChipClass, resolveResultBadge } from './result-badge'

describe('resolveResultBadge — 게임 1개 = 세트 1개', () => {
    it('게임이 없으면 미확정', () => {
        expect(resolveResultBadge([]).label).toBe('미확정')
    })

    it('게임 1개는 승/패/무', () => {
        expect(resolveResultBadge([{ me: 6, opp: 4 }]).label).toBe('승')
        expect(resolveResultBadge([{ me: 4, opp: 6 }]).label).toBe('패')
        expect(resolveResultBadge([{ me: 6, opp: 6 }]).label).toBe('무')
    })

    it('게임 2개 이상은 다수결 승자 대신 전적 요약', () => {
        const b = resolveResultBadge([{ me: 6, opp: 4 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }])
        expect(b.label).toBe('3게임 · 2승 1패')
    })

    it('색 바: 승/패/무가 서로 다르고, 멀티 게임은 미확정과도 구분된다', () => {
        const win = resolveResultBadge([{ me: 6, opp: 4 }]).barClass
        const loss = resolveResultBadge([{ me: 4, opp: 6 }]).barClass
        const draw = resolveResultBadge([{ me: 6, opp: 6 }]).barClass
        const multi = resolveResultBadge([{ me: 6, opp: 4 }, { me: 4, opp: 6 }]).barClass
        const pending = resolveResultBadge([]).barClass
        expect(new Set([win, loss, draw, multi, pending]).size).toBe(5)
    })
})

describe('gameChipClass — 패와 무를 뭉개지 않는다', () => {
    it('승/패/무가 서로 다른 클래스', () => {
        const win = gameChipClass({ me: 6, opp: 4 })
        const loss = gameChipClass({ me: 4, opp: 6 })
        const draw = gameChipClass({ me: 6, opp: 6 })
        expect(new Set([win, loss, draw]).size).toBe(3)
        expect(win).toContain('win')
        expect(loss).toContain('loss')
    })
})
