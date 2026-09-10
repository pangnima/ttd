'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import { Button } from '@/components/ui/button'
import { FORM_CANCEL } from '@/lib/dashboard/tokens'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoomInviteMemberSearch } from '@/components/match-rooms/room-invite-member-search'

type Props = {
    roomId: string
    selfUserId: string
    candidates: OpponentCandidate[]
    /** 후보에서 뺄 회원 — inviteExcludedUserIds가 계산한다 */
    excludedUserIds: string[]
}

/**
 * [회원 초대] — 지목한 회원은 비밀번호를 몰라도 초대 수락만으로 들어온다(0065).
 * 방장이 열면 내보낸 회원도 후보에 다시 뜬다 — 강퇴를 되돌리는 유일한 경로다(0068 §5).
 */
export function RoomInviteMemberDialog({ roomId, selfUserId, candidates, excludedUserIds }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button size="sm" variant="outline" className="h-7 text-caption gap-1" onClick={() => setOpen(true)}>
                <UserPlus className="size-3.5" />
                회원 초대
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md" showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>회원 초대</DialogTitle>
                    </DialogHeader>
                    <RoomInviteMemberSearch
                        roomId={roomId}
                        selfUserId={selfUserId}
                        candidates={candidates}
                        excludedUserIds={excludedUserIds}
                        onDone={() => setOpen(false)}
                    />
                    {/* 저장이 없는 팝업이라 FormActions를 쓰지 않는다 — 고르는 즉시 초대되고 남는 건 닫기뿐 */}
                    <DialogFooter>
                        <Button variant="outline" className={FORM_CANCEL} onClick={() => setOpen(false)}>
                            닫기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
