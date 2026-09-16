'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchRoomMember } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { inviteRowState } from '@/lib/match-rooms/members-view'
import { inviteRoomMembersAction } from '@/lib/actions/match-rooms'
import { DialogFooter } from '@/components/ui/dialog'
import { FormActions } from '@/components/common/form-actions'
import { useMemberLookup } from '@/components/common/member-search/use-member-lookup'
import { MemberSearchField } from '@/components/common/member-search/member-search-field'
import { MemberSearchResults } from '@/components/common/member-search/member-search-results'
import { MemberResultRow } from '@/components/common/member-search/member-result-row'
import { MemberPickChips, type MemberPick } from '@/components/common/member-search/member-pick-chips'

type Props = {
    roomId: string
    selfUserId: string
    members: MatchRoomMember[]
    /** 호스트에게만 참 — 내보낸·나간 사람을 다시 부를 수 있다(0088) */
    canReinvite: boolean
    onDone: () => void
}

/**
 * 회원 초대 — [검색]/Enter로 찾아 여러 명을 고른 뒤 [N명 초대하기]로 한 번에 부른다(0065).
 * 게스트 회원(is_guest)·탈퇴자·본인은 검색이 빼고, 이미 방에 있는 사람은 감추지 않고 비활성 + 상태 칩으로
 * 보인다(inviteRowState) — 왜 못 부르는지가 보여야 한다. 결과 목록이 바뀌어도 고른 사람은 칩에 남는다.
 */
export function RoomInviteMemberForm({ roomId, selfUserId, members, canReinvite, onDone }: Props) {
    const [term, setTerm] = useState('')
    const [picks, setPicks] = useState<MemberPick[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const lookup = useMemberLookup(selfUserId), router = useRouter()
    const pickedIds = new Set(picks.map((p) => p.userId))

    function toggle(c: OpponentCandidate) {
        setPicks((prev) => (prev.some((p) => p.userId === c.id)
            ? prev.filter((p) => p.userId !== c.id)
            : [...prev, { userId: c.id, name: c.name, meta: c.nickname }]))
    }

    function handleSubmit() {
        startTransition(async () => {
            setError(null)
            const res = await inviteRoomMembersAction(roomId, picks.map((p) => p.userId))
            if (res.error) { setError(res.error); return }
            onDone()
            router.refresh()
        })
    }

    return (
        <div className="space-y-3">
            <MemberSearchField
                value={term}
                onChange={setTerm}
                onSearch={() => lookup.search(term)}
                loading={lookup.status === 'loading'}
                placeholder="이름·닉네임으로 회원 검색"
                autoFocus
            />
            <MemberSearchResults
                status={lookup.status}
                query={lookup.query}
                results={lookup.results}
                hasMore={lookup.hasMore}
                error={lookup.error}
                idleText="이름이나 닉네임을 입력하고 검색하세요. 여러 명을 골라 한 번에 초대할 수 있습니다."
                renderRow={(c) => {
                    const state = inviteRowState(c.id, members, canReinvite)
                    return (
                        <MemberResultRow
                            key={c.id}
                            candidate={c}
                            selected={pickedIds.has(c.id)}
                            selectable={state.selectable}
                            label={state.label}
                            onToggle={() => toggle(c)}
                        />
                    )
                }}
            />
            <MemberPickChips picks={picks} onRemove={(id) => setPicks((prev) => prev.filter((p) => p.userId !== id))} />
            {error && <p className="text-caption text-destructive break-keep">{error}</p>}
            <DialogFooter>
                <FormActions
                    submitLabel={`${picks.length}명 초대하기`}
                    pendingLabel="초대하는 중…"
                    onSubmit={handleSubmit}
                    onCancel={onDone}
                    isPending={isPending}
                    disabled={picks.length === 0}
                />
            </DialogFooter>
        </div>
    )
}
