import { describe, expect, it } from 'vitest'
import { countJoined, formatHeadcount, viewerStatusLabel } from './headcount'

describe('countJoined', () => {
    it('방장·참가자 joined만 세고 viewer·초대 대기는 제외', () => {
        expect(countJoined([
            { role: 'host', status: 'joined' },
            { role: 'player', status: 'joined' },
            { role: 'player', status: 'invited' },
            { role: 'viewer', status: 'joined' },
            { role: 'viewer', status: 'requested' },
            { role: 'player', status: 'declined' },
        ])).toBe(2)
    })
})

describe('formatHeadcount', () => {
    it('joined/정원', () => {
        expect(formatHeadcount(3, 4)).toBe('3/4')
    })
})

describe('viewerStatusLabel', () => {
    it('역할·상태별 라벨', () => {
        expect(viewerStatusLabel(undefined)).toBeNull()
        expect(viewerStatusLabel({ role: 'host', status: 'joined' })).toBe('방장')
        expect(viewerStatusLabel({ role: 'player', status: 'invited' })).toBe('초대됨')
        expect(viewerStatusLabel({ role: 'player', status: 'joined' })).toBe('참가')
        expect(viewerStatusLabel({ role: 'viewer', status: 'joined' })).toBe('입장함')
        expect(viewerStatusLabel({ role: 'viewer', status: 'requested' })).toBe('합류 승인 대기')
        expect(viewerStatusLabel({ role: 'player', status: 'declined' })).toBeNull()
    })
})
