import { describe, expect, it } from 'vitest'
import { countJoined, formatHeadcount, isViewerInvolved, isViewerJoined, viewerStatusLabel } from './headcount'

describe('countJoined', () => {
    it('방장·참가자 joined만 세고 초대 대기·거절은 제외', () => {
        expect(countJoined([
            { role: 'host', status: 'joined' },
            { role: 'player', status: 'joined' },
            { role: 'player', status: 'invited' },
            { role: 'player', status: 'declined' },
        ])).toBe(2)
    })
})

describe('formatHeadcount', () => {
    it('정원 없이 참가 인원만', () => {
        expect(formatHeadcount(3)).toBe('참가 3명')
    })
})

describe('isViewerJoined', () => {
    it('joined만 true — 초대 대기·거절·미입장은 false', () => {
        expect(isViewerJoined(undefined)).toBe(false)
        expect(isViewerJoined({ role: 'host', status: 'joined' })).toBe(true)
        expect(isViewerJoined({ role: 'player', status: 'joined' })).toBe(true)
        expect(isViewerJoined({ role: 'player', status: 'invited' })).toBe(false)
        expect(isViewerJoined({ role: 'player', status: 'declined' })).toBe(false)
    })
})

describe('isViewerInvolved', () => {
    it('초대 대기도 내 경기 — 거절과 미입장만 제외', () => {
        expect(isViewerInvolved(undefined)).toBe(false)
        expect(isViewerInvolved({ role: 'host', status: 'joined' })).toBe(true)
        expect(isViewerInvolved({ role: 'player', status: 'joined' })).toBe(true)
        expect(isViewerInvolved({ role: 'player', status: 'invited' })).toBe(true)
        expect(isViewerInvolved({ role: 'player', status: 'declined' })).toBe(false)
    })
})

describe('viewerStatusLabel', () => {
    it('역할·상태별 라벨', () => {
        expect(viewerStatusLabel(undefined)).toBeNull()
        expect(viewerStatusLabel({ role: 'host', status: 'joined' })).toBe('방장')
        expect(viewerStatusLabel({ role: 'player', status: 'invited' })).toBe('초대됨')
        expect(viewerStatusLabel({ role: 'player', status: 'joined' })).toBe('참가')
        expect(viewerStatusLabel({ role: 'player', status: 'declined' })).toBeNull()
    })
})
