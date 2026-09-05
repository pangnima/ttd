import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROOM_LIST_LIMIT, fetchMatchRooms } from '@/lib/queries/match-rooms'
import { splitRooms, todayIsoKst } from '@/lib/match-rooms/split'
import { isViewerInvolved } from '@/lib/match-rooms/headcount'
import { resolveRoomListTab, roomListTabMeta, ROOM_LIST_TABS } from '@/lib/match-rooms/tabs'
import { LinkTabs } from '@/components/common/link-tabs'
import { RoomListSection } from '@/components/match-rooms/room-list-section'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '매칭 리스트' }

type Props = { searchParams: Promise<{ tab?: string }> }

/**
 * 매칭 리스트 — 노출된 경기(방) 전체. 진행 중(가까운 순) / 내가 참여한(진행 중 → 종료) / 종료된(최근순).
 * '내가 참여한'은 다른 두 탭과 교차하는 관점 필터라 종료된 방도 함께 남는다(내 경기함).
 */
export default async function MatchRoomsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const activeTab = resolveRoomListTab((await searchParams).tab)
    const rooms = await fetchMatchRooms(user.id)
    const { upcoming, past } = splitRooms(rooms, todayIsoKst())
    const mineUpcoming = upcoming.filter((r) => isViewerInvolved(r.viewer))
    const minePast = past.filter((r) => isViewerInvolved(r.viewer))
    const meta = roomListTabMeta(activeTab)

    return (
        <PageContainer>
            <PageHeader
                title="매칭 리스트"
                description="리스트에 노출된 경기입니다. 비밀번호를 입력하면 참가자·결과를 볼 수 있습니다"
                actions={
                    <Link href="/me/personal-matches/new" className="text-body2 font-medium text-primary hover:underline whitespace-nowrap">
                        + 경기 추가
                    </Link>
                }
            />

            {/* 종료 탭은 200건 상한 때문에 숫자가 진실이 아니므로 배지를 붙이지 않는다 */}
            <LinkTabs
                ariaLabel="매칭 리스트 탭"
                activeKey={activeTab}
                items={ROOM_LIST_TABS.map((t) => ({
                    ...t,
                    count: t.key === 'open' ? upcoming.length : t.key === 'mine' ? mineUpcoming.length + minePast.length : undefined,
                    emphasis: t.key === 'mine',
                }))}
            />

            {activeTab === 'mine' ? (
                mineUpcoming.length + minePast.length === 0 ? (
                    <RoomListSection rooms={[]} emptyTitle={meta.emptyTitle} emptyHint={meta.emptyHint} emptyHref="/match-rooms" />
                ) : (
                    <>
                        <RoomListSection rooms={mineUpcoming} title="진행 중" />
                        <RoomListSection rooms={minePast} title="종료됨" />
                    </>
                )
            ) : (
                <RoomListSection
                    rooms={activeTab === 'open' ? upcoming : past}
                    emptyTitle={meta.emptyTitle}
                    emptyHint={meta.emptyHint}
                    emptyHref={activeTab === 'open' ? '/me/personal-matches/new' : undefined}
                />
            )}

            {rooms.length === ROOM_LIST_LIMIT && (
                <p className="text-caption text-muted-foreground text-center">
                    최근 {ROOM_LIST_LIMIT}건만 표시합니다.
                </p>
            )}
        </PageContainer>
    )
}
