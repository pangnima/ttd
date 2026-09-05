import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyRoomIds, fetchOpenRoomCount, fetchRoomPage, type RoomPage } from '@/lib/queries/match-rooms'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { parseRoomCursor } from '@/lib/match-rooms/room-cursor'
import { resolveRoomListTab, roomListTabMeta, ROOM_LIST_TABS } from '@/lib/match-rooms/tabs'
import { LinkTabs } from '@/components/common/link-tabs'
import { RoomListSection } from '@/components/match-rooms/room-list-section'
import { RoomListPager } from '@/components/match-rooms/room-list-pager'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '매칭 리스트' }

type Props = { searchParams: Promise<{ tab?: string; cursor?: string }> }

/**
 * 매칭 리스트 — 노출된 경기(방). 진행 중(가까운 순) / 내가 참여한(진행 중 → 종료) / 종료된(최근순).
 * '내가 참여한'은 다른 두 탭과 교차하는 관점 필터라 종료된 방도 함께 남는다(내 경기함).
 *
 * 탭별 필터·정렬·페이지는 전부 서버에서 처리한다 — 화면 하나를 그리려고 목록 전체를 받지 않는다.
 * 커서는 계속 자라는 쪽(종료된 경기)에만 붙인다: '내가 참여한'의 진행 중 섹션은
 * 한 사람의 예정 경기라 페이지를 넘길 일이 없고, 섹션마다 커서를 두면 URL이 두 개가 된다.
 */
export default async function MatchRoomsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const activeTab = resolveRoomListTab(params.tab)
    const cursor = parseRoomCursor(params.cursor)
    // 형식이 깨진 커서는 무시하고 첫 페이지를 그린다 — URL에도 남기지 않는다
    const rawCursor = cursor ? params.cursor : undefined
    const todayIso = todayIsoKst()
    const meta = roomListTabMeta(activeTab)

    const [myRoomIds, openCount] = await Promise.all([fetchMyRoomIds(user.id), fetchOpenRoomCount(todayIso)])

    // '내가 참여한'은 커서를 넘기는 동안 종료 섹션만 보여준다(진행 중은 첫 페이지 전용)
    const [mineUpcoming, page] = await Promise.all([
        activeTab === 'mine' && !cursor
            ? fetchRoomPage(user.id, 'open', todayIso, { roomIds: myRoomIds })
            : Promise.resolve<RoomPage | null>(null),
        activeTab === 'mine'
            ? fetchRoomPage(user.id, 'past', todayIso, { roomIds: myRoomIds, cursor })
            : fetchRoomPage(user.id, activeTab, todayIso, { cursor }),
    ])

    const mineEmpty = activeTab === 'mine' && !cursor
        && (mineUpcoming?.rooms.length ?? 0) === 0 && page.rooms.length === 0

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

            {/* 배지는 head count와 멤버십 건수라 페이지 크기와 무관하게 정확하다. 종료 탭은 무한히 자라 숫자를 붙이지 않는다 */}
            <LinkTabs
                ariaLabel="매칭 리스트 탭"
                activeKey={activeTab}
                items={ROOM_LIST_TABS.map((t) => ({
                    ...t,
                    count: t.key === 'open' ? openCount : t.key === 'mine' ? myRoomIds.length : undefined,
                    emphasis: t.key === 'mine',
                }))}
            />

            {activeTab === 'mine' ? (
                mineEmpty ? (
                    <RoomListSection rooms={[]} emptyTitle={meta.emptyTitle} emptyHint={meta.emptyHint} emptyHref="/match-rooms" />
                ) : (
                    <>
                        {mineUpcoming && <RoomListSection rooms={mineUpcoming.rooms} title="진행 중" />}
                        <RoomListSection rooms={page.rooms} title="종료됨" />
                    </>
                )
            ) : (
                <RoomListSection
                    rooms={page.rooms}
                    emptyTitle={meta.emptyTitle}
                    emptyHint={meta.emptyHint}
                    emptyHref={activeTab === 'open' ? '/me/personal-matches/new' : undefined}
                />
            )}

            <RoomListPager tab={activeTab} cursor={rawCursor} nextCursor={page.nextCursor} />
        </PageContainer>
    )
}
