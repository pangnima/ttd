'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClubSelector } from '@/components/match-games/club-selector'
import { MatchGameTable } from '@/components/match-games/match-game-table'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { deleteMatchGameAction } from '@/lib/actions/match-games'
import { Plus, Calendar, Trophy, ChevronRight, Trash2, Lock } from 'lucide-react'
import type { Club, MatchGame, User } from '@/types'

type MatchGamesPageContentProps = {
    clubId: string
    club: Club | null
    matchGames: MatchGame[]
    members: User[]
    isMember: boolean
    myClubs: Club[]
}

export function MatchGamesPageContent({
    clubId,
    club,
    matchGames,
    members,
    isMember,
    myClubs,
}: MatchGamesPageContentProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [deleteTarget, setDeleteTarget] = useState<MatchGame | null>(null)

    const sorted = matchGames
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const latestMatchGame = sorted[0] ?? null
    const olderMatchGames = sorted.slice(1)

    function handleDelete() {
        if (!deleteTarget) return
        startTransition(async () => {
            await deleteMatchGameAction(clubId, deleteTarget.id)
            setDeleteTarget(null)
            router.refresh()
        })
    }

    if (!isMember) {
        return (
            <div className="text-center py-16 border rounded-lg border-dashed space-y-3">
                <Lock className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                <div>
                    <p className="text-sm font-medium">이 클럽의 멤버가 아닙니다</p>
                    <p className="text-xs text-muted-foreground mt-1">클럽에 가입한 후 대진표를 확인할 수 있습니다.</p>
                </div>
                <Link
                    href={`/clubs/${clubId}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                    클럽 페이지로 이동
                </Link>
            </div>
        )
    }

    return (
        <div className="w-full space-y-6">
            <div>
                <ClubSelector clubs={myClubs} currentClubId={clubId} />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">대진표</h1>
                    {club && <p className="text-sm text-muted-foreground mt-1">{club.name}</p>}
                </div>
                <Link
                    href={`/clubs/${clubId}/match-games/new`}
                    className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
                >
                    <Plus className="w-4 h-4" />
                    대진표 만들기
                </Link>
            </div>

            {sorted.length === 0 ? (
                <div className="text-center py-16 border rounded-lg border-dashed">
                    <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-muted-foreground">아직 대진표가 없습니다.</p>
                    <p className="text-xs text-muted-foreground mt-1">대진표 만들기 버튼으로 첫 대진표를 생성해보세요.</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">최신 대진표</span>
                            <Link
                                href={`/clubs/${clubId}/match-games/${latestMatchGame!.id}`}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                상세 보기 →
                            </Link>
                        </div>
                        <MatchGameTable matchGame={latestMatchGame!} members={members} clubId={clubId} />
                    </div>

                    {olderMatchGames.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">이전 대진표</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="space-y-2">
                                {olderMatchGames.map((mg) => (
                                    <div key={mg.id} className="flex items-center gap-2">
                                        <Link href={`/clubs/${clubId}/match-games/${mg.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                                                <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                                                    <Trophy className="w-4 h-4 text-amber-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{mg.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Calendar className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">{mg.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {mg.isFixed ? (
                                                        <Badge variant="secondary" className="text-xs">확정</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs">진행중</Badge>
                                                    )}
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteTarget(mg)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>대진표 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                    <strong>{deleteTarget?.name}</strong> 대진표를 삭제하시겠습니까?
                                    삭제된 대진표는 복구할 수 없습니다.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleDelete}
                                    disabled={isPending}
                                >
                                    삭제
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </div>
    )
}
