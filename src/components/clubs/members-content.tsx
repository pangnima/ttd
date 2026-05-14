'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MemberListItem } from '@/components/clubs/member-list-item'
import { getStoredMatches } from '@/lib/store/match-store'
import { getStoredClubs } from '@/lib/store/club-store'
import {
    getMembersByClubId,
    getPendingMembersByClubId,
    getMemberRoleInClub,
    approveMember,
    rejectMember,
} from '@/lib/store/club-member-store'
import { createClient } from '@/lib/supabase/client'
import { calcPlayerStats } from '@/lib/stats'
import { getUserById } from '@/lib/dummy/users'
import type { Club, ClubMember, Match } from '@/types'

type MembersContentProps = {
    clubId: string
}

export function MembersContent({ clubId }: MembersContentProps) {
    const [club, setClub] = useState<Club | null>(null)
    const [members, setMembers] = useState<ClubMember[]>([])
    const [pendingMembers, setPendingMembers] = useState<ClubMember[]>([])
    const [allMatches, setAllMatches] = useState<Match[]>([])
    const [isOwner, setIsOwner] = useState(false)

    useEffect(() => {
        setClub(getStoredClubs().find((c) => c.id === clubId) ?? null)
        setMembers(getMembersByClubId(clubId))
        setPendingMembers(getPendingMembersByClubId(clubId))
        setAllMatches(getStoredMatches())

        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setIsOwner(getMemberRoleInClub(user.id, clubId) === 'owner')
            }
        })
    }, [clubId])

    function handleApprove(memberId: string) {
        approveMember(memberId, clubId)
        setMembers(getMembersByClubId(clubId))
        setPendingMembers(getPendingMembersByClubId(clubId))
    }

    function handleReject(memberId: string) {
        rejectMember(memberId, clubId)
        setPendingMembers(getPendingMembersByClubId(clubId))
    }

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">회원 목록</h1>
                {club && <p className="text-sm text-muted-foreground mt-1">{club.name}</p>}
            </div>

            <section>
                <div className="flex items-center gap-2 mb-2">
                    <h2 className="font-semibold text-sm">승인된 회원</h2>
                    <Badge variant="secondary" className="text-xs">{members.length}명</Badge>
                </div>
                <div className="border rounded-lg divide-y">
                    {members.map((member) => {
                        const user = getUserById(member.userId)
                        if (!user) return null
                        const stats = calcPlayerStats(allMatches, member.userId)
                        return (
                            <MemberListItem
                                key={member.userId}
                                member={member}
                                user={user}
                                wins={stats.wins}
                                losses={stats.losses}
                            />
                        )
                    })}
                </div>
            </section>

            {pendingMembers.length > 0 && (
                <>
                    <Separator className="my-6" />
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="font-semibold text-sm">가입 대기</h2>
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                {pendingMembers.length}명
                            </Badge>
                        </div>
                        <div className="border rounded-lg divide-y border-dashed">
                            {pendingMembers.map((member) => {
                                const user = getUserById(member.userId)
                                if (!user) return null
                                return (
                                    <div key={member.userId} className="flex items-center justify-between pr-3">
                                        <div className="flex-1 opacity-60">
                                            <MemberListItem member={member} user={user} />
                                        </div>
                                        {isOwner && (
                                            <div className="flex gap-1.5 shrink-0">
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleApprove(member.userId)}
                                                >
                                                    승인
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleReject(member.userId)}
                                                >
                                                    거절
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        {!isOwner && (
                            <p className="text-xs text-muted-foreground mt-2">
                                ※ 승인/거절은 클럽 운영자만 가능합니다.
                            </p>
                        )}
                    </section>
                </>
            )}
        </>
    )
}
