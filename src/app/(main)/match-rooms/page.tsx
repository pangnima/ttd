import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpenRoomCount, fetchRoomPage } from '@/lib/queries/match-rooms'
import { fetchRoomQueue } from '@/lib/queries/room-queue'
import { todayIsoKst } from '@/lib/match-rooms/split'
import { parseRoomCursor } from '@/lib/match-rooms/room-cursor'
import {
    MATCH_ROOMS_PATH, MY_ROOMS_PATH, resolveRoomListTab, roomTabHref, roomTabMeta, ROOM_LIST_TABS,
} from '@/lib/match-rooms/tabs'
import { LinkTabs } from '@/components/common/link-tabs'
import { RoomCreateLink } from '@/components/match-rooms/room-create-link'
import { RoomListSection } from '@/components/match-rooms/room-list-section'
import { RoomListPager } from '@/components/match-rooms/room-list-pager'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { PageGuide } from '@/components/guide/page-guide'

export const metadata = { title: '매칭 리스트' }

type Props = { searchParams: Promise<{ tab?: string; cursor?: string }> }

/**
 * 매칭 리스트 — 노출된 **모든** 방. 진행 중(가까운 순) / 종료된(최근순), 시간 축 하나로 배타적이다.
 *
 * 관계 축('내가 참여한')은 Week 45에 `/me/match-rooms`로 나갔다. 초대 섹션·작업 큐 강조도 함께 갔고,
 * 여기 남은 것은 고르러 오는 순수 목록이다. 카드의 「내 차례」 필만은 남긴다 —
 * 목록에서 곧장 알아보는 편이 낫고, fetchRoomQueue가 React cache라 추가 왕복이 없다.
 */
export default async function MatchRoomsPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    // 레거시 `?tab=mine` — 북마크·뒤로가기로 남아 있다. 폴백에 맡기면 조용히 '진행 중인 경기'(전체)가
    // 열리므로 명시적으로 옮긴다. 커서가 있으면 옛 mine 탭에서 **종료 섹션**을 넘기던 중이었으므로
    // 그 탭으로 이어 주고, 커서가 없으면 첫 페이지가 진행 중을 먼저 보여주던 대로 기본 탭으로 보낸다.
    if (params.tab === 'mine') {
        redirect(params.cursor
            ? roomTabHref(MY_ROOMS_PATH, 'past', params.cursor)
            : roomTabHref(MY_ROOMS_PATH, 'open'))
    }

    const activeTab = resolveRoomListTab(params.tab)
    const cursor = parseRoomCursor(params.cursor)
    // 형식이 깨진 커서는 무시하고 첫 페이지를 그린다 — URL에도 남기지 않는다
    const rawCursor = cursor ? params.cursor : undefined
    const todayIso = todayIsoKst()
    const meta = roomTabMeta(ROOM_LIST_TABS, activeTab)

    // 비노출 방(0082)은 여기 오지 않는다 — 숫자와 목록이 같은 집합을 보도록 두 호출이 같은 옵션을 쓴다
    const [openCount, roomQueue, page] = await Promise.all([
        fetchOpenRoomCount(todayIso, { listedOnly: true }),
        fetchRoomQueue(user.id),
        fetchRoomPage(user.id, activeTab, todayIso, { cursor, listedOnly: true }),
    ])

    return (
        <PageContainer>
            <PageHeader
                title="매칭 리스트"
                description="리스트에 노출된 경기입니다. 비밀번호를 입력하면 참가자·결과를 볼 수 있습니다"
            />

            {/* 남의 방이 있어 목록은 거의 비지 않으므로 "한 번도 참가한 적 없음"을 펼침 신호로 쓴다 */}
            <PageGuide id="match-rooms" open={roomQueue.joinedRoomIds.length === 0} />

            {/* 만들기는 아래 목록에 딸린 행동이라 탭 바와 한 묶음으로 둔다(헤더 actions 아님) */}
            <div className="space-y-3">
                <RoomCreateLink />
                {/* 배지는 head count라 페이지 크기와 무관하게 정확하다. 종료 탭은 무한히 자라 숫자를 붙이지 않는다 */}
                <LinkTabs
                    ariaLabel="매칭 리스트 탭"
                    activeKey={activeTab}
                    items={ROOM_LIST_TABS.map((t) => ({
                        ...t,
                        count: t.key === 'open' ? openCount : undefined,
                    }))}
                />
            </div>

            <RoomListSection
                rooms={page.rooms}
                emptyTitle={meta.emptyTitle}
                emptyHint={meta.emptyHint}
                emptyHref={meta.emptyHref}
                turns={roomQueue.turns}
            />

            <RoomListPager base={MATCH_ROOMS_PATH} tab={activeTab} cursor={rawCursor} nextCursor={page.nextCursor} />
        </PageContainer>
    )
}
