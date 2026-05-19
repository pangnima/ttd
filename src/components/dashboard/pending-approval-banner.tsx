'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { approveMemberAction, rejectMemberAction } from '@/lib/actions/club-members'
import type { PendingEntry } from '@/lib/queries/clubs'

type Props = { entries: PendingEntry[] }

export function PendingApprovalBanner({ entries }: Props) {
    const [isPending, startTransition] = useTransition()

    if (entries.length === 0) return null

    const handleApprove = (clubId: string, userId: string) =>
        startTransition(async () => { await approveMemberAction(clubId, userId) })

    const handleReject = (clubId: string, userId: string) =>
        startTransition(async () => { await rejectMemberAction(clubId, userId) })

    return (
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/[0.05] p-4 space-y-3">
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <p className="text-[11px] font-medium tracking-widest uppercase text-cyan-400/80">
                    가입 승인 대기 {entries.length}건
                </p>
            </div>
            <ul className="space-y-2">
                {entries.map(({ club, member, user }) => (
                    <li
                        key={`${club.id}-${member.userId}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-foreground/8 bg-foreground/[0.02] px-3 py-2"
                    >
                        <div className="min-w-0">
                            <span className="text-sm font-medium text-foreground/95 truncate">
                                {user.nickname}
                            </span>
                            <span className="text-foreground/55 mx-1.5">·</span>
                            <Link
                                href={`/clubs/${club.id}/members`}
                                className="text-[11px] text-foreground/65 hover:text-foreground/90 transition-colors"
                            >
                                {club.name}
                            </Link>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleApprove(club.id, member.userId)}
                                disabled={isPending}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-cyan-400/40 text-cyan-400/80 bg-cyan-400/8 hover:bg-cyan-400/15 transition-colors disabled:opacity-40"
                            >
                                승인
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReject(club.id, member.userId)}
                                disabled={isPending}
                                className="text-[11px] px-2.5 py-1 rounded-full border border-foreground/15 text-foreground/65 hover:text-foreground/85 hover:border-foreground/30 transition-colors disabled:opacity-40"
                            >
                                거절
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
