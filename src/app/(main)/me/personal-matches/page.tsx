import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchPastOpponents, fetchPersonalMatchesWithConfirmation } from '@/lib/queries/personal-matches'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { fetchPendingRotationSessions } from '@/lib/queries/rotation-sessions'
import { fetchRoomParticipantCandidates } from '@/lib/queries/match-rooms'
import { PersonalMatchList } from '@/components/personal-matches/personal-match-list'
import { RotationSessionList } from '@/components/personal-matches/rotation-session-list'
import { EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'

export const metadata = { title: '개인 경기 기록' }

export default async function PersonalMatchesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // 자동완성 후보는 로테이션 결과 입력 팝업의 참가자 편집(모집형 세션에서 선수를 채울 때)에 쓴다
    const [matches, sessions, opponentCandidates, pastOpponents] = await Promise.all([
        fetchPersonalMatchesWithConfirmation(user.id),
        fetchPendingRotationSessions(user.id),
        fetchOpponentCandidates(user.id),
        fetchPastOpponents(user.id),
    ])

    // 방 세션의 빌더 풀은 "세션 풀 ∪ 방 참가자 − 나"라 방 명단이 함께 필요하다 (0050)
    const roomSessions = sessions.filter((s) => s.roomId)
    const participantLists = await Promise.all(
        roomSessions.map((s) => fetchRoomParticipantCandidates(s.roomId as string, user.id)),
    )
    const roomParticipants = Object.fromEntries(
        roomSessions.map((s, i) => [s.id, participantLists[i]]),
    )

    return (
        <PageContainer>
            <PageHeader
                title="개인 경기 기록"
                description="클럽 외부 경기를 직접 기록합니다"
                actions={
                    <Link
                        href="/me/personal-matches/new"
                        className="inline-flex items-center gap-1 text-body2 border border-border rounded-[4px] px-3 py-2 hover:border-input transition-colors"
                    >
                        + 경기 추가
                    </Link>
                }
            />

            {/* 로테이션 세션(게임 미입력)은 통계 밖이므로 목록 위 별도 섹션 */}
            <RotationSessionList
                sessions={sessions}
                viewerId={user.id}
                roomParticipants={roomParticipants}
                picker={{ candidates: opponentCandidates, pastOpponents, selfUserId: user.id }}
            />

            {matches.length === 0 && sessions.length === 0 ? (
                <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-3`}>
                    {/* 정적 SVG 장식 (내 전적 > 개인 빈 상태와 통일) */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/empty/record-empty.svg" alt="" aria-hidden width={96} height={64} draggable={false} />
                    <span>
                        아직 등록된 개인 경기가 없습니다.{' '}
                        <Link href="/me/personal-matches/new" className="text-primary hover:underline">
                            첫 경기를 기록해보세요
                        </Link>
                    </span>
                </div>
            ) : matches.length > 0 ? (
                <PersonalMatchList matches={matches} />
            ) : null}
        </PageContainer>
    )
}
