'use client'

import { useMemo, useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { buildPlayerSuggestionGroups, type PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { inviteRoomMembersAction } from '@/lib/actions/match-rooms'
import { Button } from '@/components/ui/button'
import { PlayerAutocomplete } from '@/components/personal-matches/player-autocomplete'
import { useUserSearch } from '@/components/personal-matches/use-user-search'

type Props = {
    roomId: string
    selfUserId: string
    candidates: OpponentCandidate[]
    /** 이미 방에 있는 회원(초대 대기 포함) — 후보에서 뺀다 */
    memberUserIds: string[]
}

/**
 * 룸 안 참가자 초대 — 방장·참가자가 회원을 추가로 부른다(0065).
 * 지목된 사람은 비밀번호를 몰라도 초대 수락만으로 들어온다. 게스트는 방에 들어올 수 없어 후보에서 빠진다.
 */
export function RoomInviteMembers({ roomId, selfUserId, candidates, memberUserIds }: Props) {
    const [open, setOpen] = useState(false)
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
            else setOpen(false)
        })
    }

    if (!open) {
        return (
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                <UserPlus className="size-3.5" />
                참가자 초대
            </Button>
        )
    }

    return (
        <div className="w-full max-w-xs space-y-1.5">
            <PlayerAutocomplete
                value={term}
                groups={groups}
                placeholder={isPending ? '초대하는 중…' : '이름·닉네임으로 회원 검색'}
                onInputChange={(next) => { setTerm(next); search.setTerm(next) }}
                onPick={handlePick}
            />
            {error && <p className="text-caption text-destructive break-keep">{error}</p>}
            <button
                type="button"
                onClick={() => { setOpen(false); setError(null) }}
                className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
                닫기
            </button>
        </div>
    )
}
