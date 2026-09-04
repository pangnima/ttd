import { describe, expect, it } from 'vitest'
import type { MatchRoomGame } from '@/types'
import { canEditRoomGame, isRoomGameParty, roomGameStatusLabel } from './game-status'

const base: MatchRoomGame = {
    id: 'g1',
    matchType: 'singles',
    setScores: [],
    participants: [{ role: 'opponent', name: '상대', userId: 'u2' }],
    ownerUserId: 'u1',
    ownerName: '작성자',
    sourceType: 'direct',
}

describe('roomGameStatusLabel', () => {
    it('결과가 있으면 칩 없음', () => {
        expect(roomGameStatusLabel({ ...base, setScores: [{ me: 6, opp: 3 }] })).toBeNull()
    })

    it('자유 기록은 라인업 완성 여부로 갈린다', () => {
        expect(roomGameStatusLabel(base)).toBe('결과 미입력')
        expect(roomGameStatusLabel({ ...base, participants: [] })).toBe('모집 중')
    })

    it('상호 확인 게임은 협상 상태를 말한다', () => {
        const mutual: MatchRoomGame = { ...base, sourceType: 'confirmation', sourceRequestId: 'r1' }
        expect(roomGameStatusLabel({ ...mutual, resultStatus: 'none' })).toBe('결과 미입력')
        expect(roomGameStatusLabel({ ...mutual, resultStatus: 'proposed' })).toBe('결과 확인 대기')
        expect(roomGameStatusLabel({ ...mutual, resultStatus: 'disputed' })).toBe('이의 제기')
    })
})

describe('canEditRoomGame · isRoomGameParty', () => {
    it('자유 기록은 작성자만 수정, 상호 확인은 아무도 못 한다', () => {
        expect(canEditRoomGame(base, 'u1')).toBe(true)
        expect(canEditRoomGame(base, 'u2')).toBe(false)
        expect(canEditRoomGame({ ...base, sourceType: 'confirmation' }, 'u1')).toBe(false)
    })

    it('당사자는 작성자와 라인업의 회원', () => {
        expect(isRoomGameParty(base, 'u1')).toBe(true)
        expect(isRoomGameParty(base, 'u2')).toBe(true)
        expect(isRoomGameParty(base, 'u3')).toBe(false)
    })
})
