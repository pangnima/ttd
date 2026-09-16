'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OpponentCandidate } from '@/lib/queries/users'
import { MIN_USER_SEARCH_LENGTH, normalizeUserSearchQuery } from '@/lib/profile/user-search'
import { queryUsers } from '@/components/common/member-search/query-users'

const DEBOUNCE_MS = 200

type Checked = { query: string; results: OpponentCandidate[] }
const NONE: OpponentCandidate[] = []

/**
 * 플랫폼 전체 회원 검색 — 이름을 **적는** 자리(선수 입력)의 타이핑 자동완성.
 * 회원을 고르는 자리(초대)는 useMemberLookup(명시 조회)을 쓰고, 둘은 같은 queryUsers를 부른다.
 *
 * 상태를 `checked`(마지막으로 답이 온 검색어와 그 결과) 하나만 두고 `loading`을 파생한다 —
 * 현재 검색어와 답이 온 검색어가 다르면 아직 묻는 중이다(useAvailabilityCheck의 관용구).
 * 그래서 화면은 대기 중에 「없습니다」가 아니라 「검색 중…」을 말할 수 있다.
 */
export function useUserSearch(selfUserId?: string) {
    const [term, setTerm] = useState('')
    const [checked, setChecked] = useState<Checked | null>(null)
    const query = normalizeUserSearchQuery(term)
    const active = !!selfUserId && query.length >= MIN_USER_SEARCH_LENGTH

    useEffect(() => {
        if (!active) return
        let cancelled = false
        const timer = setTimeout(async () => {
            const res = await queryUsers(createClient(), query, selfUserId)
            if (cancelled) return
            setChecked({ query, results: res.results })
        }, DEBOUNCE_MS)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [active, query, selfUserId])

    const settled = checked?.query === query
    return {
        term,
        setTerm,
        // 답을 기다리는 동안은 직전 결과를 그대로 준다 — 호출부(buildPlayerSuggestionGroups)가 현재 입력값으로 다시 거른다
        results: active && checked ? checked.results : NONE,
        loading: active && !settled,
    }
}
