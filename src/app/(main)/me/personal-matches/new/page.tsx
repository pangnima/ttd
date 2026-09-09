import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { fetchMatchQueue, scheduleSlotsOf } from '@/lib/queries/match-queue'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '직접 기록' }

type Props = { searchParams: Promise<{ room?: string }> }

/**
 * 직접 기록 — 비회원(게스트)과 친 경기를 내 기록에만 남긴다(Week 39).
 * 회원이 끼는 경기는 매칭 룸을 거친다(direct-record.ts) — 폼이 그때 매칭 만들기로 안내한다.
 */
export default async function NewPersonalMatchPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 방 게임 입력은 매칭 룸 안 다이얼로그로 옮겼다(0049 이후 참가자 전원이 룸에서 등록한다).
    // 라우트를 없애지 않는 이유: 기존 북마크·뒤로가기·외부 링크가 404 대신 룸에 착지하도록.
    const { room } = await searchParams
    if (room) redirect(`/match-rooms/${room}`)

    // fetchMatchQueue는 React cache이고 (main)/layout.tsx이 뱃지 때문에 이미 호출한다 —
    // 여기서 다시 불러도 쿼리는 늘지 않는다(중복 일정 경고용 슬롯만 파생한다, 0057)
    const [opponentCandidates, pastOpponents, recentCourtNames, queue] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRecentCourtNames(user.id),
        fetchMatchQueue(user.id),
    ])

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="직접 기록"
                description="비회원과 친 경기를 내 기록에만 남깁니다. 회원과 친 경기는 매칭을 만들어 기록해주세요"
            />
            <PersonalMatchForm
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                recentCourtNames={recentCourtNames}
                selfUserId={user.id}
                scheduleSlots={scheduleSlotsOf(queue)}
            />
        </PageContainer>
    )
}
