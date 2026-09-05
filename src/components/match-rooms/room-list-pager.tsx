import Link from 'next/link'
import { roomListHref, type RoomListTab } from '@/lib/match-rooms/tabs'

type Props = {
    tab: RoomListTab
    /** 지금 보고 있는 페이지의 커서 (첫 페이지면 없음) */
    cursor?: string
    /** 다음 페이지 커서 (마지막 페이지면 null) */
    nextCursor: string | null
}

/**
 * 매칭 리스트 페이지 이동 — keyset 커서라 '이전'은 만들지 않는다(역방향 커서가 따로 필요하다).
 * 대신 첫 페이지로 돌아가는 링크를 두고, 한 칸 뒤는 브라우저 뒤로가기가 처리한다.
 */
export function RoomListPager({ tab, cursor, nextCursor }: Props) {
    if (!cursor && !nextCursor) return null
    return (
        <nav className="flex items-center justify-between gap-2" aria-label="매칭 리스트 페이지 이동">
            {cursor ? (
                <Link href={roomListHref(tab)} className="text-body2 text-muted-foreground hover:text-foreground">
                    ← 처음으로
                </Link>
            ) : <span />}
            {nextCursor && (
                <Link href={roomListHref(tab, nextCursor)} className="text-body2 font-medium text-primary hover:underline">
                    다음 →
                </Link>
            )}
        </nav>
    )
}
