import { describe, expect, it } from 'vitest'
import type { MatchRoomGame } from '@/types'
import { buildRoomGameLabels, buildRoomGameLine, buildRoomGameSets } from './game-labels'

const OWNER = 'u-owner'
const OPP = 'u-opp'
const PARTNER = 'u-partner'
const OPP2 = 'u-opp2'

function singles(): MatchRoomGame {
    return {
        id: 'g1',
        matchType: 'singles',
        setScores: [],
        participants: [{ role: 'opponent', name: '상대', userId: OPP }],
        ownerUserId: OWNER,
        ownerName: '작성자',
        sourceType: 'confirmation',
    }
}

function doubles(): MatchRoomGame {
    return {
        id: 'g2',
        matchType: 'men_doubles',
        setScores: [],
        participants: [
            { role: 'partner', name: '내파트너', userId: PARTNER },
            { role: 'opponent', name: '상대1', userId: OPP },
            { role: 'opponent2', name: '상대2', userId: OPP2 },
        ],
        ownerUserId: OWNER,
        ownerName: '작성자',
        sourceType: 'confirmation',
    }
}

describe('buildRoomGameLabels — 단식', () => {
    it('작성자는 그대로', () => {
        expect(buildRoomGameLabels(singles(), OWNER)).toEqual({
            matchType: 'singles', opponentName: '상대', partnerName: undefined, opponent2Name: undefined,
        })
    })

    it('상대는 작성자를 상대로 본다', () => {
        expect(buildRoomGameLabels(singles(), OPP)).toEqual({
            matchType: 'singles', opponentName: '작성자', partnerName: undefined, opponent2Name: undefined,
        })
    })

    it('당사자가 아니면 작성자 관점', () => {
        expect(buildRoomGameLabels(singles(), 'u-stranger').opponentName).toBe('상대')
    })
})

describe('buildRoomGameLabels — 복식', () => {
    it('작성자는 그대로', () => {
        expect(buildRoomGameLabels(doubles(), OWNER)).toEqual({
            matchType: 'men_doubles', opponentName: '상대1', partnerName: '내파트너', opponent2Name: '상대2',
        })
    })

    it('상대1 관점 — 팀을 가로질러 반전, 파트너는 상대2', () => {
        expect(buildRoomGameLabels(doubles(), OPP)).toEqual({
            matchType: 'men_doubles', opponentName: '작성자', partnerName: '상대2', opponent2Name: '내파트너',
        })
    })

    it('상대2 관점 — 파트너는 상대1', () => {
        expect(buildRoomGameLabels(doubles(), OPP2)).toEqual({
            matchType: 'men_doubles', opponentName: '작성자', partnerName: '상대1', opponent2Name: '내파트너',
        })
    })

    it('작성자의 파트너 관점 — 팀 구성은 그대로고 파트너만 작성자로', () => {
        expect(buildRoomGameLabels(doubles(), PARTNER)).toEqual({
            matchType: 'men_doubles', opponentName: '상대1', partnerName: '작성자', opponent2Name: '상대2',
        })
    })
})

describe('buildRoomGameLabels — 참가자 미정(모집 중)', () => {
    it('상대 슬롯이 비어 있으면 빈 문자열 (labels.ts가 "미정"으로 렌더)', () => {
        const g: MatchRoomGame = { ...singles(), participants: [] }
        expect(buildRoomGameLabels(g, OWNER).opponentName).toBe('')
    })
})

describe('buildRoomGameLine', () => {
    it('작성자는 자기 이름으로 시작하는 작성자 관점 라인', () => {
        expect(buildRoomGameLine(doubles(), OWNER)).toBe('작성자 · 내파트너 vs 상대1 · 상대2')
    })

    it('상대팀 회원은 팀을 가로질러 나 기준으로 본다', () => {
        expect(buildRoomGameLine(doubles(), OPP)).toBe('나 · 상대2 vs 작성자 · 내파트너')
    })

    it('작성자의 파트너는 팀 안쪽만 바뀐다', () => {
        expect(buildRoomGameLine(doubles(), PARTNER)).toBe('나 · 작성자 vs 상대1 · 상대2')
    })

    it('이 게임과 무관한 방 참가자에게는 나를 쓰지 않는다', () => {
        // 정원 없는 방(0048)에는 다른 조합의 참가자도 들어와 있다 — 남의 게임이 내 게임처럼 보이면 안 된다
        expect(buildRoomGameLine(doubles(), 'u-bystander')).toBe('작성자 · 내파트너 vs 상대1 · 상대2')
    })

    it('상대가 아직 비어 있으면 모집 문구', () => {
        const seed: MatchRoomGame = { ...doubles(), participants: [], sourceType: 'direct' }
        expect(buildRoomGameLine(seed, OWNER)).toBe('작성자 vs (참가자 미정)')
        expect(buildRoomGameLine(seed, 'u-bystander')).toBe('작성자 vs (참가자 미정)')
    })
})

describe('buildRoomGameSets', () => {
    // 대표 게임(작성자 행)의 세트 — 상대팀에게는 그대로 보여주면 승패가 뒤집힌다
    const played = (): MatchRoomGame => ({
        ...doubles(),
        setScores: [{ me: 6, opp: 4, myAd: 'partner', oppAd: 'opponent' }],
    })

    it('작성자·같은 팀 파트너·제3자는 대표 행 값을 그대로 본다', () => {
        expect(buildRoomGameSets(played(), OWNER)[0]).toMatchObject({ me: 6, opp: 4 })
        expect(buildRoomGameSets(played(), PARTNER)[0]).toMatchObject({ me: 6, opp: 4 })
        expect(buildRoomGameSets(played(), 'u-bystander')[0]).toMatchObject({ me: 6, opp: 4 })
    })

    it('상대팀 회원은 라인과 같은 관점으로 반전된 스코어를 본다', () => {
        expect(buildRoomGameSets(played(), OPP)[0]).toEqual({ me: 4, opp: 6, myAd: 'me', oppAd: 'opponent2' })
        expect(buildRoomGameSets(played(), OPP2)[0]).toEqual({ me: 4, opp: 6, myAd: 'me', oppAd: 'opponent2' })
    })

    it('세트가 없으면 빈 배열 그대로', () => {
        expect(buildRoomGameSets(doubles(), OPP)).toEqual([])
    })
})
