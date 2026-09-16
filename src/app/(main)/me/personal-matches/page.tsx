import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSettledPersonalMatches } from '@/lib/queries/personal-matches'
import { fetchMatchQueue } from '@/lib/queries/match-queue'
import { fetchRotationBuilderContext } from '@/lib/queries/rotation-builder-context'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { PendingResultsSection } from '@/components/personal-matches/pending-results-section'
import { HEADER_ACTION_LINK, TEXT_LINK } from '@/lib/dashboard/tokens'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { PageGuide } from '@/components/guide/page-guide'
import { NAV_LABEL } from '@/lib/nav-items'

export const metadata = { title: NAV_LABEL.myRecords }

/**
 * 내 전적 — 확정된 경기 전부와, 방 밖 직접 기록 중 아직 스코어가 없는 것들(Week 39).
 *
 * 진행 중인 매칭은 여기 없다. 방에 속한 미확정 행은 매칭 룸이 그리고, 그 목록(매칭 리스트)이
 * 방을 가로지르는 작업 큐다 — 하나의 경기가 놓이는 자리는 room_id가 가른다.
 */
export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [matches, queue] = await Promise.all([
        fetchSettledPersonalMatches(user.id),
        fetchMatchQueue(user.id),
    ])
    const builder = await fetchRotationBuilderContext(queue, user.id)

    return (
        <PageContainer>
            <PageHeader
                title={NAV_LABEL.myRecords}
                description="확정된 전적을 봅니다. 비회원과 친 경기는 여기서 직접 기록할 수 있습니다"
            />

            <PageGuide id="personal-matches" open={matches.length === 0} />

            {/* 헤더 actions가 아니라 목록 위 별도 행 — 두 매칭 목록 화면의 [+ 매칭 만들기](RoomCreateLink)와 같은 자리(Week 54 규칙) */}
            <div className="flex justify-end">
                <Link href="/me/personal-matches/new" className={HEADER_ACTION_LINK}>
                    + 직접 기록
                </Link>
            </div>

            <PendingResultsSection queue={queue} viewerId={user.id} builder={builder} />

            {matches.length > 0 ? (
                <PersonalMatchList matches={matches} />
            ) : (
                <EmptyState
                    image="/empty/record-empty.svg"
                    title={<>아직 확정된 경기가 없습니다.{' '}<Link href="/match-rooms" className={TEXT_LINK}>매칭이 끝나면 전적이 여기로 옵니다</Link></>}
                />
            )}
        </PageContainer>
    )
}
