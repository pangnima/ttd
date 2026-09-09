'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { PILL_BASE } from '@/lib/dashboard/tokens'
import { Button } from '@/components/ui/button'
import { RoomGuestForm } from '@/components/match-rooms/room-guest-form'
import { RoomInviteMemberSearch } from '@/components/match-rooms/room-invite-member-search'

type Props = {
    roomId: string
    selfUserId: string
    candidates: OpponentCandidate[]
    /** 이미 방에 있는 회원(초대 대기 포함) — 후보에서 뺀다 */
    memberUserIds: string[]
}

type Mode = 'member' | 'guest'

const TABS: { value: Mode; label: string }[] = [
    { value: 'member', label: '회원 초대' },
    { value: 'guest', label: '비회원 추가' },
]

/**
 * 룸 안 참가자 추가 — 방장·참가자가 사람을 부른다(0065·0069).
 * 회원은 '초대'(수락하면 비밀번호 없이 참가)이고, 비회원은 '추가'다 — 수락할 계정이 없어 곧바로 명단에 오른다.
 */
export function RoomInviteMembers({ roomId, selfUserId, candidates, memberUserIds }: Props) {
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<Mode>('member')

    if (!open) {
        return (
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                <UserPlus className="size-3.5" />
                참가자 추가
            </Button>
        )
    }

    return (
        <div className="w-full max-w-xs space-y-2">
            <div className="flex items-center gap-1.5">
                {TABS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        onClick={() => setMode(t.value)}
                        className={`${PILL_BASE} transition-colors ${
                            mode === t.value
                                ? 'border-primary/40 text-primary'
                                : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {mode === 'member' ? (
                <RoomInviteMemberSearch
                    roomId={roomId}
                    selfUserId={selfUserId}
                    candidates={candidates}
                    memberUserIds={memberUserIds}
                    onDone={() => setOpen(false)}
                />
            ) : (
                <RoomGuestForm roomId={roomId} onDone={() => setOpen(false)} />
            )}

            <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-caption text-muted-foreground hover:text-foreground transition-colors"
            >
                닫기
            </button>
        </div>
    )
}
