'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { buildPlayerSuggestionGroups, type PlayerSuggestion } from '@/lib/personal-matches/player-suggestions'
import { MATCH_ROOM_INVITE_MAX } from '@/lib/match-rooms/create-match'
import { MATCH_FORM_LABEL, PILL_BASE } from '@/lib/dashboard/tokens'
import { PlayerAutocomplete } from '@/components/personal-matches/player-autocomplete'
import { useUserSearch } from '@/components/personal-matches/use-user-search'
import type { InviteeRow } from '@/components/match-rooms/use-match-room-form-state'

type Props = {
    selfUserId: string
    candidates: OpponentCandidate[]
    invitees: InviteeRow[]
    onAdd: (row: InviteeRow) => void
    onRemove: (userId: string) => void
}

/**
 * 상대 지목 — 회원만. 게스트는 방에 들어올 수 없으므로 userId가 없는 후보('만나본 사람' 중 비회원)는 걸러진다.
 * 지목된 회원은 방 생성 직후 invite_room_members(0065)로 초대되고, 수락하면 비밀번호 없이 참가한다.
 */
export function RoomInviteeSection({ selfUserId, candidates, invitees, onAdd, onRemove }: Props) {
    const [term, setTerm] = useState('')
    const search = useUserSearch(selfUserId)
    const picked = new Set(invitees.map((r) => r.userId))
    const full = invitees.length >= MATCH_ROOM_INVITE_MAX

    const groups = useMemo(
        () => buildPlayerSuggestionGroups(term, { pastOpponents: [], candidates, searchResults: search.results })
            .map((g) => ({ ...g, items: g.items.filter((i) => !!i.userId && !i.isGuest && !picked.has(i.userId)) }))
            .filter((g) => g.items.length > 0),
        // picked는 invitees에서 파생되므로 배열 자체를 의존성으로 둔다
        [term, candidates, search.results, invitees], // eslint-disable-line react-hooks/exhaustive-deps
    )

    function handleInput(next: string) {
        setTerm(next)
        search.setTerm(next)
    }

    function handlePick(item: PlayerSuggestion) {
        if (item.userId && !full) onAdd({ userId: item.userId, name: item.label, meta: item.meta })
        setTerm('')
        search.setTerm('')
    }

    return (
        <div>
            <label className={MATCH_FORM_LABEL}>상대 초대 (선택)</label>
            {!full && (
                <PlayerAutocomplete
                    value={term}
                    groups={groups}
                    placeholder="이름·닉네임으로 회원 검색"
                    onInputChange={handleInput}
                    onPick={handlePick}
                />
            )}
            {invitees.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                    {invitees.map((row) => (
                        <li key={row.userId}>
                            <button
                                type="button"
                                onClick={() => onRemove(row.userId)}
                                aria-label={`${row.name} 초대 취소`}
                                className={`${PILL_BASE} gap-1 border-primary/40 text-primary hover:bg-primary/10 transition-colors`}
                            >
                                {row.name}
                                <X className="size-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                {full
                    ? `한 번에 ${MATCH_ROOM_INVITE_MAX}명까지 초대할 수 있습니다. 나머지는 룸에서 추가로 부를 수 있습니다.`
                    : '비워 두면 모집 중인 매칭으로 리스트에 올라갑니다. 룸에 들어온 뒤에도 참가자를 초대할 수 있습니다.'}
            </p>
        </div>
    )
}
