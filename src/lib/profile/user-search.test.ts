import { describe, expect, it } from 'vitest'
import type { OpponentCandidate } from '@/lib/queries/users'
import {
    MIN_USER_SEARCH_LENGTH, USER_SEARCH_LIMIT,
    buildUserSearchPattern, normalizeUserSearchQuery, rankUserSearchResults, splitOverflow,
} from './user-search'

const c = (name: string, nickname?: string): OpponentCandidate => ({ id: name, name, nickname, isGuest: false, clubNames: [] })

describe('normalizeUserSearchQuery', () => {
    it('trim + 연속 공백 축약', () => {
        expect(normalizeUserSearchQuery('  김   민수 ')).toBe('김 민수')
    })
})

describe('buildUserSearchPattern', () => {
    it('앞뒤 % 감싸기', () => {
        expect(buildUserSearchPattern('남자')).toBe('%남자%')
    })

    it('1자도 조회한다 — 하한이 1', () => {
        expect(MIN_USER_SEARCH_LENGTH).toBe(1)
        expect(buildUserSearchPattern('김')).toBe('%김%')
    })

    it('PostgREST or() 구문 문자 ,()는 제거', () => {
        expect(buildUserSearchPattern('a,(b)')).toBe('%ab%')
    })

    it('LIKE 와일드카드 %·_와 백슬래시는 이스케이프', () => {
        expect(buildUserSearchPattern('kim_a')).toBe('%kim\\_a%')
        expect(buildUserSearchPattern('50%')).toBe('%50\\%%')
        expect(buildUserSearchPattern('a\\b')).toBe('%a\\\\b%')
    })

    it('구문 문자만 남으면 null — 조회하지 않는다', () => {
        expect(buildUserSearchPattern('   ')).toBeNull()
        expect(buildUserSearchPattern(',()')).toBeNull()
    })
})

describe('rankUserSearchResults', () => {
    it('이름 또는 닉네임이 검색어로 시작하는 사람이 먼저, 그 안에서 이름순', () => {
        const rows = [c('박김철'), c('김철수'), c('이영희', 'kimmy'), c('김민수')]
        expect(rankUserSearchResults(rows, '김').map((r) => r.name)).toEqual(['김민수', '김철수', '박김철', '이영희'])
        expect(rankUserSearchResults(rows, 'kim').map((r) => r.name)).toEqual(['이영희', '김민수', '김철수', '박김철'])
    })

    it('대소문자를 가리지 않는다', () => {
        const rows = [c('bob', 'Zed'), c('alice', 'KIM')]
        expect(rankUserSearchResults(rows, 'kim')[0].name).toBe('alice')
    })

    it('원본 배열을 바꾸지 않는다', () => {
        const rows = [c('b'), c('a')]
        rankUserSearchResults(rows, 'a')
        expect(rows.map((r) => r.name)).toEqual(['b', 'a'])
    })
})

describe('splitOverflow', () => {
    it('limit+1건이면 limit건 + hasMore', () => {
        const rows = Array.from({ length: USER_SEARCH_LIMIT + 1 }, (_, i) => i)
        expect(splitOverflow(rows, USER_SEARCH_LIMIT)).toEqual({ items: rows.slice(0, USER_SEARCH_LIMIT), hasMore: true })
    })

    it('limit건 이하면 그대로 + hasMore false', () => {
        expect(splitOverflow([1, 2], USER_SEARCH_LIMIT)).toEqual({ items: [1, 2], hasMore: false })
    })
})
