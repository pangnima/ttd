import { describe, expect, it } from 'vitest'
import type { EnteredRotationGame } from './rotation-entered'
import { isDormantSession } from './session-visibility'

const game = (over: Partial<EnteredRotationGame> = {}): EnteredRotationGame => ({
    groupSeq: 1, matchType: 'men_doubles', partnerName: 'A', opponentName: 'B', opponent2Name: 'C',
    sets: [{ me: 6, opp: 4 }], awaitingConsent: false, enteredByName: '나', enteredByMe: true, ...over,
})
const TODAY = '2026-09-09'

describe('isDormantSession — 게임 전부 확정 + 경기일 경과면 개인 경기 결과에서 숨긴다', () => {
    it('게임이 있고, 내 미확정 행이 없고, 날짜가 지났으면 숨긴다', () => {
        expect(isDormantSession({ playedAt: '2026-09-08' }, [game()], false, TODAY)).toBe(true)
    })

    it('게임이 없으면 숨기지 않는다 — 아직 아무것도 넣지 않은 일정', () => {
        expect(isDormantSession({ playedAt: '2026-09-01' }, [], false, TODAY)).toBe(false)
    })

    it('내 미확정 행(제안·확인 대기)이 남아 있으면 숨기지 않는다', () => {
        expect(isDormantSession({ playedAt: '2026-09-08' }, [game()], true, TODAY)).toBe(false)
    })

    it('수락 대기 게임(0064 이전 선적립)이 남아 있으면 숨기지 않는다', () => {
        expect(isDormantSession({ playedAt: '2026-09-08' }, [game({ awaitingConsent: true })], false, TODAY)).toBe(false)
    })

    it('경기 당일까지는 보인다 — 게임을 더 넣을 수 있다', () => {
        expect(isDormantSession({ playedAt: TODAY }, [game()], false, TODAY)).toBe(false)
        expect(isDormantSession({ playedAt: '2026-09-10' }, [game()], false, TODAY)).toBe(false)
    })
})
