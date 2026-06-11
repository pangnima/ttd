'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MatchGameTable } from '@/components/match-games/match-game-table'
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
import { deleteMatchGameAction } from '@/lib/actions/match-games'
import { PageContainer } from '@/components/common/page-container'
import { Plus, Calendar, Trophy, ChevronRight, Trash2, Lock } from 'lucide-react'
import type { Club, MatchGame, User } from '@/types'

type MatchGamesPageContentProps = {
    clubId: string
    club: Club | null
    matchGames: MatchGame[]
    members: User[]
    isMember: boolean
    isOwner: boolean
    currentUserId: string
}

export function MatchGamesPageContent({
    clubId,
    club,
    matchGames,
    members,
    isMember,
    isOwner,
    currentUserId,
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
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-border rounded-xl bg-card">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">이 클럽의 멤버가 아닙니다</p>
                    <p className="text-xs text-muted-foreground">클럽에 가입한 후 대진표를 확인할 수 있습니다.</p>
                </div>
                <Link
                    href={`/clubs/${clubId}`}
                    className="mt-1 text-xs border border-input rounded-full px-4 py-1.5 text-muted-foreground hover:border-input hover:text-foreground transition-colors"
                >
                    클럽 페이지로 이동
                </Link>
            </div>
        )
    }

    return (
        <PageContainer>
            {/* 헤더 */}
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                    {club ? `${club.name} 대진표` : '대진표'}
                </h1>
                <Link
                    href={`/clubs/${clubId}/match-games/new`}
                    className="flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-full px-4 py-2 hover:bg-primary/90 transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    대진표 만들기
                </Link>
            </div>

            {sorted.length === 0 ? (
                /* 빈 상태 */
                <div className="flex flex-col items-center justify-center py-20 gap-4 border border-border border-dashed rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm text-foreground">아직 대진표가 없습니다.</p>
                        <p className="text-xs text-muted-foreground">대진표 만들기 버튼으로 첫 대진표를 생성해보세요.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* 최신 대진표 */}
                    <div className="space-y-3">
                        <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                                <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                                    최신 대진표
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-base font-semibold text-foreground truncate">{latestMatchGame!.name}</p>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                        <Calendar className="w-3 h-3" />
                                        {latestMatchGame!.date}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href={`/clubs/${clubId}/match-games/${latestMatchGame!.id}`}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                상세 보기 →
                            </Link>
                        </div>
                        <MatchGameTable
                            matchGame={latestMatchGame!}
                            members={members}
                            clubId={clubId}
                            isOwner={isOwner}
                            currentUserId={currentUserId}
                        />
                    </div>

                    {/* 이전 대진표 */}
                    {olderMatchGames.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground shrink-0">
                                    이전 대진표
                                </span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="space-y-2">
                                {olderMatchGames.map((mg) => (
                                    <div key={mg.id} className="flex items-center gap-2">
                                        <Link href={`/clubs/${clubId}/match-games/${mg.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-foreground/18 hover:bg-foreground/[0.04] transition-all cursor-pointer">
                                                <div className="w-9 h-9 rounded-md bg-muted/50 border border-foreground/10 flex items-center justify-center shrink-0">
                                                    <Trophy className="w-4 h-4 text-foreground/40" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-foreground/90 truncate">{mg.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Calendar className="w-3 h-3 text-foreground/50" />
                                                        <span className="text-xs text-muted-foreground">{mg.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-sm border ${
                                                        mg.isFixed
                                                            ? 'border-win/40 text-win bg-win/10'
                                                            : 'border-border text-muted-foreground'
                                                    }`}>
                                                        {mg.isFixed ? '완료' : '진행중'}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-foreground/45" />
                                                </div>
                                            </div>
                                        </Link>
                                        <button
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-foreground/45 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                                            onClick={() => setDeleteTarget(mg)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                        <AlertDialogContent className="bg-card border border-border text-foreground">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">대진표 삭제</AlertDialogTitle>
                                <AlertDialogDescription className="text-foreground/50">
                                    <strong className="text-foreground/70">{deleteTarget?.name}</strong> 대진표를 삭제하시겠습니까?
                                    삭제된 대진표는 복구할 수 없습니다.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-input text-muted-foreground hover:bg-muted hover:text-foreground">
                                    취소
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90 text-white border-0"
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
        </PageContainer>
    )
}
