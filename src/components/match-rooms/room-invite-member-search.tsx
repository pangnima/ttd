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
    /** 후보에서 뺄 회원 — 호출부의 inviteExcludedUserIds가 계산한다(호스트에게는 강퇴자가 빠지지 않는다) */
    excludedUserIds: string[]
    onDone: () => void
}

/**
 * 회원 초대 — 지목한 사람은 비밀번호를 몰라도 초대 수락만으로 들어온다(0065).
 * 게스트 회원(is_guest)은 로그인해 수락할 수 없으므로 후보에서 빠진다 — 비회원은 [비회원 등록]이 맡는다.
 * 호스트가 열었을 때만 내보낸 회원이 후보에 남는다(excludedUserIds) — 강퇴를 되돌리는 유일한 경로다.
 */
export function RoomInviteMemberSearch({ roomId, selfUserId, candidates, excludedUserIds, onDone }: Props) {
    const [term, setTerm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const search = useUserSearch(selfUserId)

    const groups = useMemo(() => {
        const taken = new Set([...excludedUserIds, selfUserId])
        return buildPlayerSuggestionGroups(term, { pastOpponents: [], candidates, searchResults: search.results })
            .map((g) => ({ ...g, items: g.items.filter((i) => !!i.userId && !i.isGuest && !taken.has(i.userId)) }))
            .filter((g) => g.items.length > 0)
    }, [term, candidates, search.results, excludedUserIds, selfUserId])

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
