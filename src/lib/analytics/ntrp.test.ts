import { describe, expect, it } from 'vitest'
import type { PersonalMatchWinner } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { aggregateByNtrpDiff } from './ntrp'

const ME = 'me'

function pm(winner: PersonalMatchWinner, extra: Partial<SettledPersonalMatch> = {}): SettledPersonalMatch {
    return {
        id: 'p', userId: ME, opponentName: 'X', playedAt: '2026-06-01',
        matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner, createdAt: '2026-06-01',
        ...extra,
    }
}

// F-23 — 개인 탭의 「NTRP 대비 성적」이 클럽 매치만 읽어 늘 비어 있었다
describe('aggregateByNtrpDiff — 개인 경기', () => {
    const userMap = new Map([['u-strong', { ntrp: 4.0 }], ['u-nontrp', {}]])

    it('스냅샷 NTRP로 상위/동급/하위를 가른다(±0.25)', () => {
        const stats = aggregateByNtrpDiff({
            matches: [], userMap,
            personalMatches: [
                pm('me', { opponentNtrp: 3.5 }),   // +0.5 → stronger
                pm('opponent', { opponentNtrp: 3.1 }), // +0.1 → peer
                pm('me', { opponentNtrp: 2.5 }),   // -0.5 → weaker
            ],
        }, ME, 3.0)
        expect(stats.stronger).toMatchObject({ wins: 1, losses: 0 })
        expect(stats.peer).toMatchObject({ wins: 0, losses: 1 })
        expect(stats.weaker).toMatchObject({ wins: 1, losses: 0 })
        expect(stats.unknown).toMatchObject({ wins: 0, losses: 0 })
    })

    it('스냅샷이 없으면 회원 상대의 userMap NTRP, 그것도 없으면 unknown', () => {
        const stats = aggregateByNtrpDiff({
            matches: [], userMap,
            personalMatches: [
                pm('me', { opponentUserId: 'u-strong' }),   // 4.0 → stronger
                pm('opponent', { opponentUserId: 'u-nontrp' }), // unknown
                pm('draw'),                                   // 비회원·스냅샷 없음 → unknown
            ],
        }, ME, 3.0)
        expect(stats.stronger).toMatchObject({ wins: 1, losses: 0 })
        expect(stats.unknown).toMatchObject({ wins: 0, losses: 1, draws: 1 })
    })

    it('복식은 아는 상대 NTRP끼리 평균이고, 스냅샷이 userMap보다 먼저다', () => {
        const stats = aggregateByNtrpDiff({
            matches: [], userMap,
            personalMatches: [
                // (3.5 + 2.5) / 2 = 3.0 → peer
                pm('me', { matchType: 'men_doubles', opponentNtrp: 3.5, opponent2Ntrp: 2.5 }),
                // 스냅샷 2.0이 userMap 4.0을 이긴다 → weaker
                pm('me', { opponentNtrp: 2.0, opponentUserId: 'u-strong' }),
            ],
        }, ME, 3.0)
        expect(stats.peer).toMatchObject({ wins: 1 })
        expect(stats.weaker).toMatchObject({ wins: 1 })
    })

    it('내 NTRP를 모르면 아무것도 세지 않는다', () => {
        const stats = aggregateByNtrpDiff({ matches: [], userMap, personalMatches: [pm('me', { opponentNtrp: 3.5 })] }, ME, null)
        expect(stats.stronger.wins + stats.unknown.wins).toBe(0)
    })
})
