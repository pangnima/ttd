import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyRoomIds, fetchOpenRoomCount, fetchRoomPage } from '@/lib/queries/match-rooms'
import { fetchRoomQueue } from '@/lib/queries/room-queue'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { parseRoomCursor } from '@/lib/match-rooms/room-cursor'
import { MY_ROOMS_PATH, MY_ROOM_TABS, resolveRoomListTab, roomTabMeta } from '@/lib/match-rooms/tabs'
import { sortByMyTurnFirst } from '@/lib/match-rooms/room-sort'
import { LinkTabs } from '@/components/common/link-tabs'
import { RoomCreateLink } from '@/components/match-rooms/room-create-link'
import { RoomInvitesSection } from '@/components/match-rooms/room-invites-section'
import { RoomListSection } from '@/components/match-rooms/room-list-section'
import { RoomListPager } from '@/components/match-rooms/room-list-pager'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { PageGuide } from '@/components/guide/page-guide'

export const metadata = { title: '참여 중인 매칭' }

type Props = { searchParams: Promise<{ tab?: string; cursor?: string }> }

/**
 * 참여 중인 매칭 (Week 45) — 내가 참가(joined)한 방 + 나를 초대한 매칭.
 *
 * **사이드바 뱃지가 착지하는 화면**이다. 뱃지 = `roomBadgeTotal` = 초대 + 내 차례가 있는 방인데,
 * 그 둘이 여기 한 화면에 함께 그려진다 — 뱃지 정의("그려지는 강조 카드 수")가 실제로 참이 되는 자리.
 * 매칭 리스트에 관점 필터 탭으로 얹혀 있던 시절에는 뱃지를 눌러도 기본 탭이 전체 목록이라 어긋났다.
 */
export default async function MyMatchRoomsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const activeTab = resolveRoomListTab(params.tab)
    const cursor = parseRoomCursor(params.cursor)
    const rawCursor = cursor ? params.cursor : undefined
    const todayIso = todayIsoKst()
    const meta = roomTabMeta(MY_ROOM_TABS, activeTab)

    // 참여 = joined만. 초대(invited)는 아직 내 방이 아니라 아래 초대 섹션이 맡는다(Week 39)
    // 내 방은 **정산 축**으로 가른다 — 결과 입력이 남은 방은 경기일이 지나도 진행 중이다.
    // 내 차례가 있는 방은 정의상 미정산이라, 뱃지가 센 방이 전부 기본 탭에 모인다.
    const myRoomIds = await fetchMyRoomIds(user.id)
    const [openCount, roomQueue, page] = await Promise.all([
        fetchOpenRoomCount(todayIso, { roomIds: myRoomIds, axis: 'settlement' }),
        fetchRoomQueue(user.id),
        fetchRoomPage(user.id, activeTab, todayIso, { roomIds: myRoomIds, cursor, axis: 'settlement' }),
    ])

    // ⚠ 내 차례 우선 정렬은 **첫 페이지 한 장 안에서만** — 커서 기준(DB 정렬)을 깨면 행이 새거나 겹친다
    const rooms = !cursor ? sortByMyTurnFirst(page.rooms, roomQueue.turns) : page.rooms

    return (
        <PageContainer>
            <PageHeader
                title="참여 중인 매칭"
                description="내가 참가한 매칭입니다. 결과 입력·확인은 각 매칭 안에서 합니다"
            />

            {/* 참가한 방도 초대도 없을 때만 펼친다 — 그 외에는 한 줄로 접혀 카드를 가리지 않는다 */}
            <PageGuide id="my-match-rooms" open={myRoomIds.length === 0 && roomQueue.invites.length === 0} />

            {/* 만들기는 아래 목록에 딸린 행동이라 탭 바와 한 묶음으로 둔다(헤더 actions 아님) */}
            <div className="space-y-3">
                <RoomCreateLink />
                <LinkTabs
                    ariaLabel="참여 중인 매칭 탭"
                    activeKey={activeTab}
                    items={MY_ROOM_TABS.map((t) => ({
                        ...t,
                        count: t.key === 'open' ? openCount : undefined,
                    }))}
                />
            </div>

            {/* 초대는 고르는 것이 아니라 답해야 하는 것이라 탭 뒤에 숨기지 않는다 */}
            <RoomInvitesSection invites={roomQueue.invites} />

            <RoomListSection
                rooms={rooms}
                emptyTitle={meta.emptyTitle}
                emptyHint={meta.emptyHint}
                emptyHref={meta.emptyHref}
                turns={roomQueue.turns}
            />

            <RoomListPager base={MY_ROOMS_PATH} tab={activeTab} cursor={rawCursor} nextCursor={page.nextCursor} />
        </PageContainer>
    )
}
