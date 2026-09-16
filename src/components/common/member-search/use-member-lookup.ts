'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OpponentCandidate } from '@/lib/queries/users'
import { MIN_USER_SEARCH_LENGTH, normalizeUserSearchQuery } from '@/lib/profile/user-search'
import { queryUsers } from './query-users'

export type MemberLookupStatus = 'idle' | 'loading' | 'done' | 'error'

type Lookup = {
    /** 마지막으로 조회한 검색어(정규화값) — 빈 결과 문구·중복 조회 판정에 쓴다 */
    query: string
    status: MemberLookupStatus
    results: OpponentCandidate[]
    hasMore: boolean
    error: string | null
}

const IDLE: Lookup = { query: '', status: 'idle', results: [], hasMore: false, error: null }

/**
 * 회원을 **고르는** 자리의 명시 조회 — [검색] 버튼이나 Enter가 부른다(타이핑 중에는 조회하지 않는다).
 * 자동완성(useUserSearch)과 같은 queryUsers를 쓰되 debounce가 없고, 결과 목록은 다음 조회까지 그대로 남는다 —
 * 여러 명을 고르는 동안 목록이 출렁이지 않아야 한다.
 *
 * 늦게 온 응답은 seq로 버린다. 같은 검색어를 연달아 누르면(조합 확정 Enter 뒤 keydown이 한 번 더 오는 IME)
 * 두 번 조회하지 않는다.
 */
export function useMemberLookup(selfUserId: string) {
    const [state, setState] = useState<Lookup>(IDLE)
    const seq = useRef(0)
    const inFlight = useRef<string | null>(null)

    const search = useCallback(async (raw: string) => {
        const query = normalizeUserSearchQuery(raw)
        if (query.length < MIN_USER_SEARCH_LENGTH || inFlight.current === query) return
        const mySeq = ++seq.current
        inFlight.current = query
        setState((prev) => ({ ...prev, query, status: 'loading', error: null }))

        const res = await queryUsers(createClient(), query, selfUserId)
        if (mySeq !== seq.current) return
        inFlight.current = null
        setState({ query, status: res.error ? 'error' : 'done', results: res.results, hasMore: res.hasMore, error: res.error })
    }, [selfUserId])

    const reset = useCallback(() => {
        seq.current++
        inFlight.current = null
        setState(IDLE)
    }, [])

    return { ...state, search, reset }
}
