'use client'

import { useMemo, useState, useTransition } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { buildPlayerSuggestionGroups, type PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { inviteRoomMembersAction } from '@/lib/actions/match-rooms'
import { PlayerAutocomplete } from '@/components/personal-matches/player-autocomplete'
import { useUserSearch } from '@/components/personal-matches/use-user-search'

type Props = {
    roomId: string
    selfUserId: string
    candidates: OpponentCandidate[]
    /** 이미 방에 있는 회원(초대 대기 포함) — 후보에서 뺀다 */
    memberUserIds: string[]
    onDone: () => void
}

/**
 * 회원 초대 — 지목한 사람은 비밀번호를 몰라도 초대 수락만으로 들어온다(0065).
 * 게스트 회원(is_guest)은 로그인해 수락할 수 없으므로 후보에서 빠진다 — 비회원은 [비회원] 탭이 맡는다.
 */
export function RoomInviteMemberSearch({ roomId, selfUserId, candidates, memberUserIds, onDone }: Props) {
    const [term, setTerm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const search = useUserSearch(selfUserId)

    const groups = useMemo(() => {
        const taken = new Set([...memberUserIds, selfUserId])
        return buildPlayerSuggestionGroups(term, { pastOpponents: [], candidates, searchResults: search.results })
            .map((g) => ({ ...g, items: g.items.filter((i) => !!i.userId && !i.isGuest && !taken.has(i.userId)) }))
            .filter((g) => g.items.length > 0)
    }, [term, candidates, search.results, memberUserIds, selfUserId])

    function handlePick(item: PlayerSuggestion) {
        if (!item.userId) return
        const userId = item.userId
        setTerm('')
        search.setTerm('')
        startTransition(async () => {
            setError(null)
            const res = await inviteRoomMembersAction(roomId, [userId])
            if (res.error) setError(res.error)
            else onDone()
        })
    }

    return (
        <div className="space-y-1.5">
            <PlayerAutocomplete
                value={term}
                groups={groups}
                placeholder={isPending ? '초대하는 중…' : '이름·닉네임으로 회원 검색'}
                onInputChange={(next) => { setTerm(next); search.setTerm(next) }}
                onPick={handlePick}
            />
            {error && <p className="text-caption text-destructive break-keep">{error}</p>}
        </div>
    )
}
