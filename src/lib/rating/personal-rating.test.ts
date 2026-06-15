import { describe, expect, it } from 'vitest'
import type { PersonalMatch, PersonalMatchWinner, PersonalMatchSetScore } from '@/types'
import { replayPersonalRatings, resolveOpponentRating } from './personal-rating'
import { DEFAULT_RATING, MIN_RATING, MAX_RATING, PROVISIONAL_THRESHOLD } from './elo'

// 개인 경기 생성 헬퍼 (레이팅 계산에 필요한 최소 필드).
function pm(over: Partial<PersonalMatch> & { id: string; playedAt: string; winner: PersonalMatchWinner }): PersonalMatch {
    return {
        userId: 'me',
        opponentName: '상대',
        matchType: 'singles',
        setScores: [{ me: 6, opp: 4 }],
        ...over,
    } as PersonalMatch
}

const noResolver = () => undefined

describe('resolveOpponentRating — fallback 체인', () => {
    it('① 저장된 opponentNtrp가 최우선', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentNtrp: 4.0, opponentUserId: 'u1' })
        expect(resolveOpponentRating(m, 3.0, () => 2.0)).toBe(4.0)
    })
    it('② 추정치 없으면 등록 단식 상대 ntrp', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentUserId: 'u1' })
        expect(resolveOpponentRating(m, 3.0, (id) => (id === 'u1' ? 3.5 : null))).toBe(3.5)
    })
    it('② 복식은 상대1·2 ntrp 평균', () => {
        const m = pm({
            id: '1', playedAt: '2025-01-01', winner: 'me', matchType: 'men_doubles',
            opponentUserId: 'u1', opponent2UserId: 'u2',
        })
        const r = resolveOpponentRating(m, null, (id) => (id === 'u1' ? 3.0 : id === 'u2' ? 4.0 : null))
        expect(r).toBe(3.5)
    })
    it('① 복식은 저장된 상대1·2 NTRP 평균', () => {
        const m = pm({
            id: '1', playedAt: '2025-01-01', winner: 'me', matchType: 'men_doubles',
            opponentNtrp: 3.0, opponent2Ntrp: 5.0,
        })
        expect(resolveOpponentRating(m, null, noResolver)).toBe(4.0)
    })
    it('① 복식 상대2 NTRP만 없으면 상대1 값 사용', () => {
        const m = pm({
            id: '1', playedAt: '2025-01-01', winner: 'me', matchType: 'men_doubles',
            opponentNtrp: 3.0,
        })
        expect(resolveOpponentRating(m, null, noResolver)).toBe(3.0)
    })
    it('③ 등록 상대 정보 없으면 본인 ntrp(동급 가정)', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentName: '외부' })
        expect(resolveOpponentRating(m, 4.5, noResolver)).toBe(4.5)
    })
    it('④ 전부 없으면 기본 2.5', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentName: '외부' })
        expect(resolveOpponentRating(m, null, noResolver)).toBe(DEFAULT_RATING)
    })
    it('0 이하 ntrp(미설정)는 무시', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentUserId: 'u1' })
        expect(resolveOpponentRating(m, 0, (id) => (id === 'u1' ? 0 : null))).toBe(DEFAULT_RATING)
    })
})

describe('replayPersonalRatings — 기본 동작', () => {
    it('빈 입력은 시작값 유지 + 잠정', () => {
        const snap = replayPersonalRatings([], 3.0, noResolver)
        expect(snap.rating).toBe(3.0)
        expect(snap.matchesPlayed).toBe(0)
        expect(snap.provisional).toBe(true)
        expect(snap.history).toHaveLength(0)
    })

    it('본인 ntrp가 없으면 기본 2.5에서 시작', () => {
        const snap = replayPersonalRatings([], null, noResolver)
        expect(snap.rating).toBe(DEFAULT_RATING)
    })

    it('약자(2.5)가 강한 상대(4.0)에게 승리하면 레이팅 상승', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'me', opponentNtrp: 4.0, setScores: [{ me: 6, opp: 4 }] })
        const snap = replayPersonalRatings([m], null, noResolver)
        expect(snap.rating).toBeGreaterThan(DEFAULT_RATING)
        expect(snap.history[0].delta).toBeGreaterThan(0)
        expect(snap.history[0].oppRating).toBe(4.0)
    })

    it('강자(4.0)가 약한 상대(2.0)에게 패배하면 큰 폭 하락', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'opponent', opponentNtrp: 2.0, setScores: [{ me: 4, opp: 6 }] })
        const snap = replayPersonalRatings([m], 4.0, noResolver)
        expect(snap.rating).toBeLessThan(4.0)
        expect(snap.history[0].delta).toBeLessThan(0)
    })

    it('무승부는 변동 작음(S=0.5, margin=1.0)', () => {
        const m = pm({ id: '1', playedAt: '2025-01-01', winner: 'draw', opponentNtrp: 2.5, setScores: [{ me: 6, opp: 6 }] })
        const snap = replayPersonalRatings([m], null, noResolver)
        // 동급 무승부면 기대 0.5 = 실제 0.5 → 거의 변동 없음
        expect(Math.abs(snap.rating - DEFAULT_RATING)).toBeLessThan(1e-9)
    })
})

describe('replayPersonalRatings — 정렬 결정성', () => {
    it('입력 순서가 뒤바뀌어도 동일 결과(시간순 재정렬)', () => {
        const a = pm({ id: 'a', playedAt: '2025-01-01', playedTime: '10:00', winner: 'me', opponentNtrp: 3.0 })
        const b = pm({ id: 'b', playedAt: '2025-01-02', playedTime: '10:00', winner: 'opponent', opponentNtrp: 3.0 })
        const c = pm({ id: 'c', playedAt: '2025-01-03', playedTime: '10:00', winner: 'me', opponentNtrp: 3.0 })
        const asc = replayPersonalRatings([a, b, c], null, noResolver)
        const desc = replayPersonalRatings([c, b, a], null, noResolver)
        expect(desc.rating).toBeCloseTo(asc.rating, 12)
        expect(desc.history.map((h) => h.matchId)).toEqual(asc.history.map((h) => h.matchId))
    })
})

describe('replayPersonalRatings — 잠정기 K 전환', () => {
    it('PROVISIONAL_THRESHOLD 미만은 잠정, 이상은 정착', () => {
        const make = (n: number): PersonalMatch[] =>
            Array.from({ length: n }, (_, i) =>
                pm({ id: `m${i}`, playedAt: `2025-02-${String(i + 1).padStart(2, '0')}`, winner: 'me', opponentNtrp: 3.0 }),
            )
        const provisional = replayPersonalRatings(make(PROVISIONAL_THRESHOLD - 1), null, noResolver)
        expect(provisional.provisional).toBe(true)
        const settled = replayPersonalRatings(make(PROVISIONAL_THRESHOLD), null, noResolver)
        expect(settled.provisional).toBe(false)
    })
})

describe('replayPersonalRatings — 복식', () => {
    it('파트너 NTRP 미설정이면 기존과 동일(내 레이팅만 사용)', () => {
        const m = pm({
            id: '1', playedAt: '2025-01-01', winner: 'me', matchType: 'men_doubles',
            opponentNtrp: 3.5, partnerUserId: 'strong-partner', setScores: [{ me: 6, opp: 3 }],
        })
        const snap = replayPersonalRatings([m], null, noResolver)
        // 파트너 강도 정보가 없으면 selfSide=내 레이팅 → 상대팀 3.5 대비 승리 반영
        expect(snap.history[0].oppRating).toBe(3.5)
        expect(snap.rating).toBeGreaterThan(DEFAULT_RATING)
    })

    it('강한 파트너 NTRP가 반영되면 같은 승리라도 상승폭이 작다', () => {
        const base = {
            id: '1', playedAt: '2025-01-01', winner: 'me' as PersonalMatchWinner, matchType: 'men_doubles' as const,
            opponentNtrp: 3.0, opponent2Ntrp: 3.0, setScores: [{ me: 6, opp: 4 }],
        }
        // 파트너 정보 없음 → selfSide 2.5
        const weak = replayPersonalRatings([pm(base)], null, noResolver)
        // 강한 파트너(6.0) → selfSide (2.5+6.0)/2 = 4.25 → 기대승률↑ → 상승폭↓
        const strong = replayPersonalRatings([pm({ ...base, partnerNtrp: 6.0 })], null, noResolver)
        expect(strong.history[0].delta).toBeGreaterThan(0)
        expect(strong.history[0].delta).toBeLessThan(weak.history[0].delta)
    })

    it('파트너 NTRP는 회원 ntrp로도 보강된다', () => {
        const m = pm({
            id: '1', playedAt: '2025-01-01', winner: 'me', matchType: 'men_doubles',
            opponentNtrp: 3.0, opponent2Ntrp: 3.0, partnerUserId: 'p1', setScores: [{ me: 6, opp: 4 }],
        })
        const noPartner = replayPersonalRatings([pm({ ...m, partnerUserId: undefined })], null, noResolver)
        const memberPartner = replayPersonalRatings([m], null, (id) => (id === 'p1' ? 6.0 : null))
        // 회원 파트너 강도(6.0)가 반영되어 상승폭이 더 작아야 한다
        expect(memberPartner.history[0].delta).toBeLessThan(noPartner.history[0].delta)
    })
})

describe('replayPersonalRatings — 경계 클램프', () => {
    it('극단 연승으로도 MAX_RATING 초과하지 않음', () => {
        const wins: PersonalMatch[] = Array.from({ length: 60 }, (_, i) =>
            pm({
                id: `w${i}`,
                playedAt: `2025-03-${String((i % 28) + 1).padStart(2, '0')}`,
                playedTime: `${String(i).padStart(2, '0')}:00`,
                winner: 'me' as PersonalMatchWinner,
                opponentNtrp: 7.0,
                setScores: [{ me: 6, opp: 0 } as PersonalMatchSetScore],
            }),
        )
        const snap = replayPersonalRatings(wins, 6.5, noResolver)
        expect(snap.rating).toBeLessThanOrEqual(MAX_RATING)
        expect(snap.rating).toBeGreaterThanOrEqual(MIN_RATING)
    })
})
