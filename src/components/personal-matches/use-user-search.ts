'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { OpponentCandidate } from '@/lib/queries/users'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

/**
 * 플랫폼 전체 회원 검색 (상호 확인 대진 상대 지정용).
 * 클라이언트에서 디바운스된 read-only 쿼리 — users SELECT는 RLS상 인증 유저에게 열려 있다.
 * 게스트·탈퇴 유저·본인은 제외한다.
 */
export function useUserSearch(selfUserId?: string) {
    const [term, setTermState] = useState('')
    const [results, setResults] = useState<OpponentCandidate[]>([])

    // 검색어가 짧아지면 결과를 즉시 비운다 (effect 내부 동기 setState 회피)
    const setTerm = useCallback((next: string) => {
        setTermState(next)
        if (next.trim().length < MIN_QUERY_LENGTH) setResults([])
    }, [])

    useEffect(() => {
        const query = term.trim()
        if (!selfUserId || query.length < MIN_QUERY_LENGTH) return
        let cancelled = false
        const timer = setTimeout(async () => {
            const supabase = createClient()
            // or() 필터 구문과 충돌하는 문자는 제거
            const escaped = query.replace(/[%,()]/g, '')
            if (!escaped) return
            const { data } = await supabase
                .from('users')
                .select('id, name, nickname, ntrp, personal_ntrp')
                .eq('is_guest', false)
                .is('deleted_at', null)
                .neq('id', selfUserId)
                .or(`name.ilike.%${escaped}%,nickname.ilike.%${escaped}%`)
                .limit(20)
            if (cancelled) return
            setResults(
                (data ?? []).map((u) => ({
                    id: u.id,
                    name: u.name,
                    nickname: u.nickname,
                    ntrp: u.ntrp ?? undefined,
                    personalNtrp: u.personal_ntrp != null ? Number(u.personal_ntrp) : undefined,
                    isGuest: false,
                    clubNames: [],
                })),
            )
        }, DEBOUNCE_MS)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [term, selfUserId])

    return { term, setTerm, results }
}
