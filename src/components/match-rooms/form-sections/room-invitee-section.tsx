'use client'

import { useState } from 'react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { MATCH_ROOM_INVITE_MAX } from '@/lib/match-rooms/create-match'
import { MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { useMemberLookup } from '@/components/common/member-search/use-member-lookup'
import { MemberSearchField } from '@/components/common/member-search/member-search-field'
import { MemberSearchResults } from '@/components/common/member-search/member-search-results'
import { MemberResultRow } from '@/components/common/member-search/member-result-row'
import { MemberPickChips } from '@/components/common/member-search/member-pick-chips'
import type { InviteeRow } from '@/components/match-rooms/use-match-room-form-state'

type Props = {
    selfUserId: string
    invitees: InviteeRow[]
    onAdd: (row: InviteeRow) => void
    onRemove: (userId: string) => void
}

/**
 * 상대 지목 — 회원만. [검색]/Enter로 조회한 결과에서 행을 눌러 고르고, 고른 사람은 칩으로 모인다.
 * 지목된 회원은 방 생성 직후 invite_room_members(0065)로 초대되고, 수락하면 비밀번호 없이 참가한다.
 * 저장은 폼의 [매칭 만들기]가 하므로 여기엔 확정 버튼이 없다 — 행 클릭이 곧 토글이다.
 * 상한(MATCH_ROOM_INVITE_MAX)에 닿으면 입력창은 남기고 고르지 않은 행만 비활성으로 둔다.
 */
export function RoomInviteeSection({ selfUserId, invitees, onAdd, onRemove }: Props) {
    const [term, setTerm] = useState('')
    const lookup = useMemberLookup(selfUserId)
    const picked = new Set(invitees.map((r) => r.userId))
    const full = invitees.length >= MATCH_ROOM_INVITE_MAX

    function toggle(c: OpponentCandidate) {
        if (picked.has(c.id)) onRemove(c.id)
        else if (!full) onAdd({ userId: c.id, name: c.name, meta: c.nickname })
    }

    return (
        <div className="space-y-2">
            <label className={MATCH_FORM_LABEL}>상대 초대 (선택)</label>
            <MemberSearchField
                value={term}
                onChange={setTerm}
                onSearch={() => lookup.search(term)}
                loading={lookup.status === 'loading'}
                placeholder="이름·닉네임으로 회원 검색"
            />
            <MemberSearchResults
                status={lookup.status}
                query={lookup.query}
                results={lookup.results}
                hasMore={lookup.hasMore}
                error={lookup.error}
                idleText="이름이나 닉네임을 입력하고 검색하세요. 여러 명을 고를 수 있습니다."
                renderRow={(c) => {
                    const selected = picked.has(c.id)
                    return (
                        <MemberResultRow
                            key={c.id}
                            candidate={c}
                            selected={selected}
                            selectable={selected || !full}
                            onToggle={() => toggle(c)}
                        />
                    )
                }}
            />
            <MemberPickChips picks={invitees} onRemove={onRemove} removeLabel="초대 취소" />
            <p className="text-caption text-muted-foreground break-keep">
                {full
                    ? `한 번에 ${MATCH_ROOM_INVITE_MAX}명까지 초대할 수 있습니다. 나머지는 룸에서 추가로 부를 수 있습니다.`
                    : '비워 두면 모집 중인 매칭으로 리스트에 올라갑니다. 룸에 들어온 뒤에도 참가자를 초대할 수 있습니다.'}
            </p>
        </div>
    )
}
