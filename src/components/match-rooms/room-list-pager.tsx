import Link from 'next/link'
import { TEXT_LINK } from '@/lib/dashboard/tokens'
import { roomTabHref, type RoomListTab } from '@/lib/match-rooms/tabs'

type Props = {
    /** 기준 경로 — 매칭 리스트와 참여 중인 매칭이 같은 페이저를 쓴다 */
    base: string
    tab: RoomListTab
    /** 지금 보고 있는 페이지의 커서 (첫 페이지면 없음) */
    cursor?: string
    /** 다음 페이지 커서 (마지막 페이지면 null) */
    nextCursor: string | null
}

/**
 * 방 목록 페이지 이동 — keyset 커서라 '이전'은 만들지 않는다(역방향 커서가 따로 필요하다).
 * 대신 첫 페이지로 돌아가는 링크를 두고, 한 칸 뒤는 브라우저 뒤로가기가 처리한다.
 */
export function RoomListPager({ base, tab, cursor, nextCursor }: Props) {
    if (!cursor && !nextCursor) return null
    return (
        <nav className="flex items-center justify-between gap-2" aria-label="목록 페이지 이동">
            {cursor ? (
                <Link href={roomTabHref(base, tab)} className="text-body2 text-muted-foreground hover:text-foreground">
                    ← 처음으로
                </Link>
            ) : <span />}
            {nextCursor && (
                <Link href={roomTabHref(base, tab, nextCursor)} className={`text-body2 font-medium ${TEXT_LINK}`}>
                    다음 →
                </Link>
            )}
        </nav>
    )
}
