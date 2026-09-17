'use client'

import Link from 'next/link'
import type { Notification } from '@/types'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { NotificationRow } from '@/components/notifications/notification-row'
import { TEXT_LINK, TYPO } from '@/lib/dashboard/tokens'

type Props = {
    recent: Notification[]
    /** 낙관적으로 읽음 처리된 id — 서버 값보다 먼저 화면이 따라간다 */
    readIds: ReadonlySet<string>
    unreadCount: number
    onOpen: (n: Notification) => void
    onReadAll: () => void
}

/** 종 아이콘 드롭다운의 안쪽 — 최근 10건, 항목 = 읽음 + 이동, 하단 [모두 읽음]·[전체 보기] */
export function NotificationMenu({ recent, readIds, unreadCount, onOpen, onReadAll }: Props) {
    return (
        <DropdownMenuContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] p-0">
            {/* DropdownMenuLabel(GroupLabel)은 Menu.Group 안에서만 쓸 수 있어 제목은 평범한 헤딩으로 */}
            <h2 className={`${TYPO.h4} px-3 py-2`}>알림</h2>
            <DropdownMenuSeparator className="my-0" />
            {recent.length === 0 ? (
                <p className="px-3 py-6 text-center text-caption text-muted-foreground">새 알림이 없습니다</p>
            ) : (
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                    {recent.map((n) => (
                        <DropdownMenuItem
                            key={n.id}
                            className="cursor-pointer rounded-none px-3 py-2.5 text-body2 focus:bg-muted"
                            onClick={() => onOpen(n)}
                        >
                            <NotificationRow notification={n} compact read={readIds.has(n.id) || n.readAt !== null} />
                        </DropdownMenuItem>
                    ))}
                </div>
            )}
            <DropdownMenuSeparator className="my-0" />
            <div className="flex items-center justify-between px-3 py-2">
                <button
                    type="button"
                    className={`${TEXT_LINK} text-caption disabled:text-muted-foreground disabled:no-underline`}
                    disabled={unreadCount === 0}
                    onClick={onReadAll}
                >
                    모두 읽음
                </button>
                <Link href="/me/notifications" className={`${TEXT_LINK} text-caption`}>전체 보기</Link>
            </div>
        </DropdownMenuContent>
    )
}
