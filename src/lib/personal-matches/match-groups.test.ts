import { describe, expect, it } from 'vitest'
import type { PersonalMatch } from '@/types'
import { buildMatchGroups } from './match-groups'

type Over = Partial<PersonalMatch> & { id: string }

function pm(o: Over): PersonalMatch {
    return {
        userId: 'me', opponentName: 'X', playedAt: '2026-06-10', playedTime: '18:00', matchType: 'men_doubles',
        partnerName: 'P', opponent2Name: 'Y', courtName: '목동',
        setScores: [{ me: 6, opp: 4 }], createdAt: '2026-06-10',
        ...o,
    }
}

describe('buildMatchGroups — 로테이션 그룹', () => {
    const s = 'sess-1'
    const g1 = pm({ id: 'g1', rotationSessionId: s, groupSeq: 1, sourceType: 'rotation' })
    const g2 = pm({ id: 'g2', rotationSessionId: s, groupSeq: 2, sourceType: 'rotation', partnerName: 'X', opponentName: 'P', setScores: [{ me: 3, opp: 6 }] })
    const g3 = pm({ id: 'g3', rotationSessionId: s, groupSeq: 3, sourceType: 'rotation', partnerName: 'Y', opponent2Name: 'Z', setScores: [{ me: 6, opp: 6 }] })

    it('같은 세션·같은 날짜 3행 → 1그룹, groupSeq 순, 3게임, 전적 1승 1패 1무, 일시·코트명 헤더 정보', () => {
        const groups = buildMatchGroups([g3, g1, g2])
        expect(groups).toHaveLength(1)
        const [g] = groups
        expect(g.kind).toBe('rotation')
        expect(g.key).toBe('rotation:sess-1:2026-06-10')
        expect(g.matches.map((m) => m.id)).toEqual(['g1', 'g2', 'g3'])
        expect(g).toMatchObject({ gameCount: 3, wins: 1, losses: 1, draws: 1, playedAt: '2026-06-10', playedTime: '18:00', courtName: '목동' })
    })

    it('참여 멤버는 파트너/상대1/상대2 이름을 첫 등장 순으로 중복 제거', () => {
        const [g] = buildMatchGroups([g1, g2, g3])
        expect(g.participantNames).toEqual(['P', 'X', 'Y', 'Z'])
    })

    it('같은 세션이라도 날짜가 다르면 다른 그룹', () => {
        const moved = pm({ ...g2, playedAt: '2026-06-11' })
        const groups = buildMatchGroups([g1, moved])
        expect(groups.map((g) => g.key)).toEqual(['rotation:sess-1:2026-06-11', 'rotation:sess-1:2026-06-10'])
    })

    it('입력 순서를 섞어도 결과가 같다', () => {
        expect(buildMatchGroups([g1, g2, g3])).toEqual(buildMatchGroups([g2, g3, g1]))
    })

    it('레거시 멀티세트 로테이션 행은 카드 1장이지만 게임 수는 세트 수로 센다', () => {
        const legacy = pm({ id: 'L', rotationSessionId: 'sess-2', groupSeq: 1, setScores: [{ me: 6, opp: 4 }, { me: 4, opp: 6 }] })
        const [g] = buildMatchGroups([legacy])
        expect(g.matches).toHaveLength(1)
        expect(g).toMatchObject({ gameCount: 2, wins: 1, losses: 1, draws: 0 })
    })
})

describe('buildMatchGroups — 레코드 그룹', () => {
    it('세션 id가 없는 행은 각각 1그룹(헤더 없음), 세트 4개 → 4게임 전적', () => {
        const a = pm({ id: 'a', matchType: 'singles', setScores: [{ me: 6, opp: 4 }, { me: 6, opp: 2 }, { me: 3, opp: 6 }, { me: 7, opp: 5 }] })
        const b = pm({ id: 'b', matchType: 'singles', playedAt: '2026-06-05', setScores: [{ me: 4, opp: 6 }] })
        const groups = buildMatchGroups([b, a])
        expect(groups.map((g) => g.key)).toEqual(['record:a', 'record:b'])
        expect(groups[0].kind).toBe('record')
        expect(groups[0]).toMatchObject({ gameCount: 4, wins: 3, losses: 1, draws: 0 })
    })

    it('미확정(세트 없음) 행은 카드 1장·게임 1개로 세되 전적 제외', () => {
        const [g] = buildMatchGroups([pm({ id: 'p', setScores: [] })])
        expect(g).toMatchObject({ gameCount: 1, wins: 0, losses: 0, draws: 0 })
    })

    it('정렬: 날짜 desc → 시각 desc → id', () => {
        const early = pm({ id: 'e', playedTime: '09:00' })
        const late = pm({ id: 'l', playedTime: '20:00' })
        const older = pm({ id: 'o', playedAt: '2026-06-01', playedTime: '23:00' })
        expect(buildMatchGroups([early, older, late]).map((g) => g.matches[0].id)).toEqual(['l', 'e', 'o'])
    })
})
