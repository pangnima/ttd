'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClubSelector } from '@/components/match-games/club-selector'
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
import { Plus, Calendar, Trophy, ChevronRight, Trash2, Lock } from 'lucide-react'
import type { Club, MatchGame, User } from '@/types'

type MatchGamesPageContentProps = {
    clubId: string
    club: Club | null
    matchGames: MatchGame[]
    members: User[]
    isMember: boolean
    myClubs: Club[]
    isOwner: boolean
}

export function MatchGamesPageContent({
    clubId,
    club,
    matchGames,
    members,
    isMember,
    myClubs,
    isOwner,
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
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-foreground/8 rounded-xl bg-foreground/[0.02]">
                <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-foreground/55" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground/85">이 클럽의 멤버가 아닙니다</p>
                    <p className="text-xs text-foreground/55">클럽에 가입한 후 대진표를 확인할 수 있습니다.</p>
                </div>
                <Link
                    href={`/clubs/${clubId}`}
                    className="mt-1 text-xs border border-foreground/15 rounded-full px-4 py-1.5 text-foreground/65 hover:border-foreground/30 hover:text-foreground/90 transition-colors"
                >
                    클럽 페이지로 이동
                </Link>
            </div>
        )
    }

    return (
        <div className="w-full space-y-6">
            {/* 클럽 선택 */}
            <div>
                <ClubSelector clubs={myClubs} currentClubId={clubId} />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">대진표</h1>
                    {club && <p className="text-sm text-foreground/60 mt-0.5">{club.name}</p>}
                </div>
                <Link
                    href={`/clubs/${clubId}/match-games/new`}
                    className="flex items-center gap-1.5 text-sm border border-foreground/20 rounded-full px-4 py-1.5 text-foreground/85 hover:bg-foreground/8 hover:border-foreground/35 hover:text-foreground transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    대진표 만들기
                </Link>
            </div>

            {sorted.length === 0 ? (
                /* 빈 상태 */
                <div className="flex flex-col items-center justify-center py-20 gap-4 border border-foreground/8 border-dashed rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-foreground/55" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm text-foreground/85">아직 대진표가 없습니다.</p>
                        <p className="text-xs text-foreground/65">대진표 만들기 버튼으로 첫 대진표를 생성해보세요.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* 최신 대진표 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium tracking-widest uppercase text-foreground/75">
                                최신 대진표
                            </span>
                            <Link
                                href={`/clubs/${clubId}/match-games/${latestMatchGame!.id}`}
                                className="text-xs text-foreground/65 hover:text-foreground/90 transition-colors"
                            >
                                상세 보기 →
                            </Link>
                        </div>
                        <MatchGameTable
                            matchGame={latestMatchGame!}
                            members={members}
                            clubId={clubId}
                            isOwner={isOwner}
                        />
                    </div>

                    {/* 이전 대진표 */}
                    {olderMatchGames.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-foreground/8" />
                                <span className="text-[11px] font-medium tracking-widest uppercase text-foreground/55 shrink-0">
                                    이전 대진표
                                </span>
                                <div className="h-px flex-1 bg-foreground/8" />
                            </div>
                            <div className="space-y-2">
                                {olderMatchGames.map((mg) => (
                                    <div key={mg.id} className="flex items-center gap-2">
                                        <Link href={`/clubs/${clubId}/match-games/${mg.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 p-4 rounded-lg border border-foreground/8 bg-foreground/[0.02] hover:border-foreground/18 hover:bg-foreground/[0.04] transition-all cursor-pointer">
                                                <div className="w-9 h-9 rounded-md bg-foreground/5 border border-foreground/10 flex items-center justify-center shrink-0">
                                                    <Trophy className="w-4 h-4 text-foreground/40" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-foreground/90 truncate">{mg.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Calendar className="w-3 h-3 text-foreground/50" />
                                                        <span className="text-xs text-foreground/60">{mg.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                                        mg.isFixed
                                                            ? 'border-cyan-400/40 text-cyan-400/80 bg-cyan-400/8'
                                                            : 'border-foreground/20 text-foreground/60'
                                                    }`}>
                                                        {mg.isFixed ? '완료' : '진행중'}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-foreground/45" />
                                                </div>
                                            </div>
                                        </Link>
                                        <button
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-foreground/45 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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
                        <AlertDialogContent className="bg-zinc-950 border border-foreground/10 text-foreground">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">대진표 삭제</AlertDialogTitle>
                                <AlertDialogDescription className="text-foreground/50">
                                    <strong className="text-foreground/70">{deleteTarget?.name}</strong> 대진표를 삭제하시겠습니까?
                                    삭제된 대진표는 복구할 수 없습니다.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-foreground/15 text-foreground/60 hover:bg-foreground/8 hover:text-foreground">
                                    취소
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-500/80 hover:bg-red-500 text-foreground border-0"
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
