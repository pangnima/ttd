import { describe, expect, it } from 'vitest'
import type { OpponentCandidate } from '@/lib/queries/users'
import { buildPlayerSuggestionGroups } from './player-suggestions'

const candidates: OpponentCandidate[] = [
    { id: 'u1', name: '김철수', nickname: 'cheol', ntrp: 3, personalNtrp: 3.214, dominantHand: 'left', isGuest: false, clubNames: ['A클럽'] },
    { id: 'u2', name: '이영희', ntrp: 2.5, isGuest: true, clubNames: ['B클럽'] },
]
const pastOpponents = [
    { name: '박민수', hand: 'right' as const, ntrp: 3.5 },
    { name: '최지우' },
]
const searchResults: OpponentCandidate[] = [
    { id: 'u1', name: '김철수', isGuest: false, clubNames: [] },  // 클럽 후보와 중복 → 제외
    { id: 'u9', name: '김철민', nickname: 'minny', ntrp: 4, isGuest: false, clubNames: [] },
]

describe('buildPlayerSuggestionGroups', () => {
    it('빈 입력은 만나본 사람·클럽 회원만 전체 노출 (전체 회원 숨김)', () => {
        const groups = buildPlayerSuggestionGroups('', { pastOpponents, candidates, searchResults })
        expect(groups.map((g) => g.value)).toEqual(['만나본 사람', '클럽 회원'])
        expect(groups[0].items.map((i) => i.label)).toEqual(['박민수', '최지우'])
        expect(groups[1].items.map((i) => i.label)).toEqual(['김철수', '이영희'])
    })

    it('입력값으로 이름·닉네임 부분 일치 필터, 그룹 순서 유지', () => {
        const groups = buildPlayerSuggestionGroups('철', { pastOpponents, candidates, searchResults })
        expect(groups.map((g) => g.value)).toEqual(['클럽 회원', '전체 회원'])
        expect(groups[0].items.map((i) => i.value)).toEqual(['club:u1'])
        // 전체 회원에서 클럽 후보(u1)는 제외되고 u9만 남는다
        expect(groups[1].items.map((i) => i.value)).toEqual(['search:u9'])
    })

    it('닉네임으로도 매칭된다 (대소문자 무시)', () => {
        const groups = buildPlayerSuggestionGroups('CHEOL', { pastOpponents, candidates })
        expect(groups).toHaveLength(1)
        expect(groups[0].items[0].userId).toBe('u1')
    })

    it('회원 항목은 손잡이·NTRP(동적 우선)·게스트 여부·클럽명을 전달', () => {
        const [club] = buildPlayerSuggestionGroups('김철수', { pastOpponents, candidates })
        const item = club.items[0]
        expect(item).toMatchObject({ userId: 'u1', hand: 'left', ntrp: 3.214, isGuest: false, meta: 'A클럽' })
        const [guest] = buildPlayerSuggestionGroups('이영희', { pastOpponents, candidates })
        expect(guest.items[0]).toMatchObject({ userId: 'u2', ntrp: 2.5, isGuest: true })
        expect(guest.items[0].hand).toBeUndefined()
    })

    it('만나본 사람 항목은 userId 없이 마지막 손잡이·NTRP를 전달', () => {
        const [past] = buildPlayerSuggestionGroups('박', { pastOpponents, candidates })
        expect(past.items[0]).toMatchObject({ value: 'past:박민수', hand: 'right', ntrp: 3.5, isGuest: true })
        expect(past.items[0].userId).toBeUndefined()
    })

    it('전체 회원 항목은 닉네임을 meta로 전달', () => {
        const groups = buildPlayerSuggestionGroups('minny', { pastOpponents, candidates, searchResults })
        expect(groups).toHaveLength(1)
        expect(groups[0].items[0]).toMatchObject({ source: 'search', meta: 'minny', ntrp: 4 })
    })

    it('일치 항목이 없으면 빈 배열', () => {
        expect(buildPlayerSuggestionGroups('zzz', { pastOpponents, candidates, searchResults })).toEqual([])
    })
})
