import { describe, expect, it } from 'vitest'
import { countJoined, formatHeadcount, isViewerJoined, viewerStatusLabel } from './headcount'

describe('countJoined', () => {
    it('호스트·참가자 joined만 세고 초대 대기·거절은 제외', () => {
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
        // 비회원이 있으면 함께 센다(U-9) — 힌트의 「참가 예정 N명」과 어긋나지 않게
        expect(formatHeadcount(1, 4)).toBe('참가 1명 · 비회원 4명')
        expect(formatHeadcount(3, 0)).toBe('참가 3명')
    })
})

describe('isViewerJoined — 게임 등록 자격 · 「참여 중인 매칭」 술어', () => {
    it('수락 전(invited)은 참여가 아니다 — 초대는 초대 섹션이 담당한다(Week 39)', () => {
        expect(isViewerJoined({ role: 'player', status: 'invited' })).toBe(false)
    })

    it('수락하면(joined) 참여다. 호스트 행도 joined이고, 거절·미입장은 아니다', () => {
        expect(isViewerJoined({ role: 'host', status: 'joined' })).toBe(true)
        expect(isViewerJoined({ role: 'player', status: 'joined' })).toBe(true)
        expect(isViewerJoined({ role: 'player', status: 'declined' })).toBe(false)
        expect(isViewerJoined(undefined)).toBe(false)
    })
})

describe('viewerStatusLabel', () => {
    it('역할·상태별 라벨', () => {
        expect(viewerStatusLabel(undefined)).toBeNull()
        expect(viewerStatusLabel({ role: 'host', status: 'joined' })).toBe('호스트')
        expect(viewerStatusLabel({ role: 'player', status: 'invited' })).toBe('초대 대기')
        expect(viewerStatusLabel({ role: 'player', status: 'joined' })).toBe('참가')
        expect(viewerStatusLabel({ role: 'player', status: 'declined' })).toBeNull()
    })
})
