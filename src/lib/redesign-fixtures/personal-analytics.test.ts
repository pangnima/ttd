import { describe, expect, it } from 'vitest'
import { getDummyAnalyticsBundle } from './personal-analytics'
import { parseFixtureScenario } from './_scenario'
import { selectRivals } from '@/lib/analytics/rival'
import { aggregatePartnerChemistry } from '@/lib/analytics/partner-chemistry'
import { aggregateHourHeatmap } from '@/lib/analytics/hour-heatmap'
import { aggregateByOpponentHand } from '@/lib/analytics/opponent-hand'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { formatUTC } from '@/lib/analytics/date-utils'

const ME = 'auth-user-1'

// 픽스처 데이터가 각 카드의 임계값(라이벌 45~55%·파트너 3세트·히트맵 28일·표면 진단 등)을
// 계속 만족하는지 고정한다 — 데이터셋을 손볼 때 화면이 조용히 비는 회귀를 막는 목적.
describe('getDummyAnalyticsBundle (with-data)', () => {
    const bundle = getDummyAnalyticsBundle({ userId: ME, gender: 'male', scope: { kind: 'personal' }, scenario: 'with-data' })
    const timeBundle = { matches: bundle.matches, gameMetaById: bundle.gameMetaById, personalMatches: bundle.personalGames }

    it('종목 4분기 모두 경기가 있고 세트 단위로 분해된다', () => {
        expect(bundle.stats.singles.totalMatches).toBeGreaterThan(0)
        expect(bundle.stats.menDoubles.totalMatches).toBeGreaterThan(0)
        expect(bundle.stats.mixedDoubles.totalMatches).toBeGreaterThan(0)
        expect(bundle.personalGames.length).toBeGreaterThan(bundle.personalMatches.length)
        // 미확정 레코드는 표시용 원본에만 남고 통계 분해본에서는 제외된다
        expect(bundle.personalMatches.some((m) => m.winner === null)).toBe(true)
        expect(bundle.personalGames.every((m) => m.winner !== null)).toBe(true)
    })

    it('라이벌(박빙 상대)이 1명 이상 잡힌다', () => {
        const rivals = selectRivals({ ...timeBundle, courtSurfaceByMatchId: {} }, ME, bundle.h2hList, bundle.userMap)
        expect(rivals.length).toBeGreaterThanOrEqual(1)
        expect(rivals.every((r) => r.winRate >= 45 && r.winRate <= 55)).toBe(true)
    })

    it('파트너 케미가 남/여 어느 성별로도 1명 이상 잡힌다', () => {
        expect(aggregatePartnerChemistry(timeBundle, ME, 'male').length).toBeGreaterThanOrEqual(1)
        const female = getDummyAnalyticsBundle({ userId: ME, gender: 'female', scope: { kind: 'personal' }, scenario: 'with-data' })
        const femaleBundle = { matches: female.matches, gameMetaById: female.gameMetaById, personalMatches: female.personalGames }
        expect(aggregatePartnerChemistry(femaleBundle, ME, 'female').length).toBeGreaterThanOrEqual(1)
        expect(female.stats.womenDoubles.totalMatches).toBeGreaterThan(0)
    })

    it('최근 28일 히트맵에 시간 있는 경기가 있다 (오늘 기준 상대 날짜)', () => {
        const weekly = aggregateHourHeatmap({ ...timeBundle, matchTimeById: {} }, formatUTC(new Date()), 28)
        expect(weekly.totalGames).toBeGreaterThan(0)
        expect(weekly.untimed).toBe(0)
    })

    it('상대 손잡이 오른손/왼손 모두 집계된다', () => {
        const hand = aggregateByOpponentHand({ ...timeBundle, userMap: bundle.userMap }, ME)
        expect(hand.right.total).toBeGreaterThan(0)
        expect(hand.left.total).toBeGreaterThan(0)
    })

    it('개인 레이팅이 잠정기(10게임)를 벗어나고 최신 폼은 연승이다', () => {
        const snapshot = replayPersonalRatings(bundle.personalGames, 3.0, (id) => bundle.userMap.get(id)?.ntrp)
        expect(snapshot.matchesPlayed).toBeGreaterThanOrEqual(10)
        expect(snapshot.provisional).toBe(false)
        const form = aggregateRecentForm(timeBundle, ME)
        expect(form.currentStreak?.type).toBe('W')
    })

    it('표면 강세·약세 진단이 각각 1건 이상 나온다', () => {
        const diagnosis = diagnoseStrengthsWeaknesses(
            { ...timeBundle, courtSurfaceByMatchId: {}, userMap: bundle.userMap },
            ME,
            3.0,
        )
        expect(diagnosis.strengths.some((s) => s.label.includes('강세'))).toBe(true)
        expect(diagnosis.weaknesses.some((w) => w.label.includes('약세'))).toBe(true)
    })
})

describe('getDummyAnalyticsBundle (empty / club scope)', () => {
    it('empty 시나리오는 모든 통계가 0이다', () => {
        const bundle = getDummyAnalyticsBundle({ userId: ME, gender: 'male', scope: { kind: 'personal' }, scenario: 'empty' })
        expect(bundle.personalMatches).toHaveLength(0)
        expect(bundle.personalGames).toHaveLength(0)
        expect(bundle.h2hList).toHaveLength(0)
        expect(bundle.stats.singles.totalMatches).toBe(0)
        expect(bundle.userMap.size).toBe(0)
    })

    it('클럽 scope는 (클럽 경기 픽스처 범위 밖이라) 빈 번들을 돌려준다', () => {
        const bundle = getDummyAnalyticsBundle({
            userId: ME, gender: 'male', scope: { kind: 'club', clubId: 'c1', clubName: '클럽' }, scenario: 'with-data',
        })
        expect(bundle.personalGames).toHaveLength(0)
    })
})

describe('parseFixtureScenario', () => {
    it("'empty'만 empty, 그 외는 with-data", () => {
        expect(parseFixtureScenario('empty')).toBe('empty')
        expect(parseFixtureScenario(undefined)).toBe('with-data')
        expect(parseFixtureScenario('anything')).toBe('with-data')
    })
})
