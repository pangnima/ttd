import { describe, expect, it } from 'vitest'
import type { MatchRoomGame } from '@/types'
import { buildRoomGameLabels } from './game-labels'

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
