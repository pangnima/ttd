'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dummyClubs } from '@/lib/dummy/clubs'
import { dummyTournaments } from '@/lib/dummy/tournaments'
import { getStoredClubs } from '@/lib/store/club-store'
import {
    getMembersByClubId,
    getMembershipStatus,
    getMemberRoleInClub,
    applyToClub,
    cancelApplication,
} from '@/lib/store/club-member-store'
import { getCurrentUserId } from '@/lib/store/auth-store'
import { ClubMembersPreview } from '@/components/clubs/club-members-preview'
import { MapPin, Users, Trophy, Settings, ChevronRight, Clock, UserPlus } from 'lucide-react'
import type { Club, ClubMember, Tournament } from '@/types'

type ClubPageProps = {
    params: Promise<{ clubId: string }>
}

export default function ClubPage({ params }: ClubPageProps) {
    const { clubId } = use(params)
    const router = useRouter()

    const [club, setClub] = useState<Club | null>(null)
    const [members, setMembers] = useState<ClubMember[]>([])
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [membershipStatus, setMembershipStatus] = useState<ClubMember['status'] | null>(null)
    const [myRole, setMyRole] = useState<ClubMember['role'] | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(() => {
        const allClubs = [...dummyClubs, ...getStoredClubs()]
        const found = allClubs.find((c) => c.id === clubId)
        if (!found) {
            router.push('/clubs')
            return
        }
        setClub(found)

        const approvedMembers = getMembersByClubId(clubId)
        setMembers(approvedMembers)

        const allTournaments = dummyTournaments.filter((t) => t.clubId === clubId)
        setTournaments(allTournaments)

        const uid = getCurrentUserId()
        setCurrentUserId(uid)
        if (uid) {
            setMembershipStatus(getMembershipStatus(uid, clubId))
            setMyRole(getMemberRoleInClub(uid, clubId))
        }

        setLoading(false)
    }, [clubId, router])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleApply = () => {
        if (!currentUserId) return
        applyToClub(currentUserId, clubId)
        setMembershipStatus('pending')
    }

    const handleCancel = () => {
        if (!currentUserId) return
        cancelApplication(currentUserId, clubId)
        setMembershipStatus(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                불러오는 중...
            </div>
        )
    }

    if (!club) return null

    const ongoingTournaments = tournaments.filter((t) => !t.isFixed)
    const isOwner = myRole === 'owner'

    return (
        <div className="w-full max-w-4xl space-y-6">
            {/* 클럽 헤더 */}
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{club.name}</h1>
                            <Badge variant={club.isPublic ? 'default' : 'secondary'}>
                                {club.isPublic ? '공개' : '비공개'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">{club.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* 가입신청 버튼 영역 */}
                        {!isOwner && membershipStatus !== 'approved' && (
                            <>
                                {membershipStatus === 'pending' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-xs text-amber-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            가입승인 대기중
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                                            onClick={handleCancel}
                                        >
                                            신청 취소
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="h-8 gap-1.5"
                                        onClick={handleApply}
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        가입 신청
                                    </Button>
                                )}
                            </>
                        )}
                        {isOwner && (
                            <Link
                                href={`/clubs/${clubId}/settings`}
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}
                            >
                                <Settings className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {club.region}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {members.length}명
                    </span>
                    <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {tournaments.length}개 대진표
                    </span>
                </div>
            </div>

            <Separator />

            {/* 진행 중인 대진표 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">진행 중인 대진표</h2>
                    <Link
                        href={`/clubs/${clubId}/tournaments`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                {ongoingTournaments.length > 0 ? (
                    <ul className="space-y-2">
                        {ongoingTournaments.map((t) => (
                            <li key={t.id}>
                                <Link
                                    href={`/clubs/${clubId}/tournaments/${t.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{t.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t.date}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">진행중</Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                        진행 중인 대진표가 없습니다.
                    </p>
                )}
            </section>

            <Separator />

            {/* 회원 미리보기 */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">회원 ({members.length}명)</h2>
                    <Link
                        href={`/clubs/${clubId}/members`}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                    >
                        전체보기 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
                <ClubMembersPreview members={members} maxDisplay={8} />
            </section>
        </div>
    )
}
