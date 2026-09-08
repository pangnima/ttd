import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPastOpponents, fetchRecentCourtNames } from '@/lib/queries/personal-matches'
import { fetchMatchQueue, scheduleSlotsOf } from '@/lib/queries/match-queue'
import { fetchMatchRequestById } from '@/lib/queries/match-requests'
import { prefillFromRequest } from '@/lib/personal-matches/request-prefill'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export const metadata = { title: '경기 기록 추가' }

type Props = { searchParams: Promise<{ room?: string; from?: string }> }

export default async function NewPersonalMatchPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 방 게임 입력은 매칭 룸 안 다이얼로그로 옮겼다(0049 이후 참가자 전원이 룸에서 등록한다).
    // 라우트를 없애지 않는 이유: 기존 북마크·뒤로가기·외부 링크가 404 대신 룸에 착지하도록.
    const { room, from } = await searchParams
    if (room) redirect(`/match-rooms/${room}`)

    // fetchMatchQueue는 React cache이고 (main)/layout.tsx이 뱃지 때문에 이미 호출한다 —
    // 여기서 다시 불러도 쿼리는 늘지 않는다(중복 일정 경고용 슬롯만 파생한다, 0057)
    // `from` = 방금 취소한 확인 요청(Week 38) — 요청자 본인의 canceled 요청만 초안이 되고, 아니면 조용히 빈 폼
    const [opponentCandidates, pastOpponents, recentCourtNames, queue, reissue] = await Promise.all([
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
        fetchRecentCourtNames(user.id),
        fetchMatchQueue(user.id),
        from ? fetchMatchRequestById(from, user.id) : Promise.resolve(null),
    ])
    const prefill = reissue ? prefillFromRequest(reissue.request, reissue.counterpart.name) : undefined

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl lg:max-w-5xl"
                title="경기 기록 추가"
                description={prefill
                    ? '취소한 요청을 바탕으로 다시 등록합니다 — 응답이 없던 참가자는 비회원(게스트)으로 바뀌었습니다. 이름을 확인하고 NTRP를 채워주세요'
                    : '클럽 외부 경기를 직접 입력합니다'}
            />
            <PersonalMatchForm
                prefill={prefill}
                opponentCandidates={opponentCandidates}
                pastOpponents={pastOpponents}
                recentCourtNames={recentCourtNames}
                selfUserId={user.id}
                scheduleSlots={scheduleSlotsOf(queue)}
            />
        </PageContainer>
    )
}
