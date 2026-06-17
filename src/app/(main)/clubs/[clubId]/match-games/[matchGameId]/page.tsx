import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchMyMembership } from '@/lib/queries/clubs'
import { fetchMatchGameById, fetchClubMembersWithGuests } from '@/lib/queries/match-games'
import { fetchUsersByIds } from '@/lib/queries/users'
import { fetchRatingDeltasByMatchGameId, fetchClubPlayerRatings, fetchConfirmedMatchesForRating } from '@/lib/queries/ratings'
import { matchPlayerIds } from '@/lib/match-games/attendance-stats'
import { buildCrossPairH2H, isRivalMatch } from '@/lib/match-games/special-match'
import { MatchGameDetailContent } from '@/components/match-games/match-game-detail-content'

type MatchGameDetailPageProps = {
    params: Promise<{ clubId: string; matchGameId: string }>
}

export default async function MatchGameDetailPage({ params }: MatchGameDetailPageProps) {
    const { clubId, matchGameId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [membership, matchGame, members, ratingByUser, confirmed] = await Promise.all([
        fetchMyMembership(user.id, clubId),
        fetchMatchGameById(matchGameId),
        fetchClubMembersWithGuests(clubId),
        fetchClubPlayerRatings(clubId),
        // 라이벌 판정용 클럽 누적 확정 경기(단식+복식).
        fetchConfirmedMatchesForRating(clubId),
    ])

    if (membership?.status !== 'approved') redirect(`/clubs/${clubId}`)
    if (!matchGame) notFound()

    const isOwner = membership?.role === 'owner'

    // 탈퇴(클럽/계정) 선수 보강: 경기에 등장한 player id 중 현재 멤버 목록에 없는 id를
    // users에서 직접 조회해 이름을 복원한다(통계 경로의 fetchUsersByIds 패턴과 동일).
    // 보강된 id 집합은 '탈퇴' 배지 표시에 사용한다.
    const memberIdSet = new Set(members.map((m) => m.id))
    const playerIds = new Set(matchGame.matches.flatMap(matchPlayerIds))
    const missingIds = [...playerIds].filter((id) => !memberIdSet.has(id))
    const formerUsers = missingIds.length > 0 ? await fetchUsersByIds(missingIds) : []
    const membersWithFormer = [...members, ...formerUsers]
    const formerMemberIds = new Set(formerUsers.map((u) => u.id))

    // 확정 대진표만 레이팅 변동(▲/▼·요약) 표시.
    const { byMatch, byUserTotal } = matchGame.isFixed
        ? await fetchRatingDeltasByMatchGameId(matchGame.matches.map((m) => m.id))
        : { byMatch: undefined, byUserTotal: undefined }

    // 클럽 누적 cross-pair 전적 → 현재 대진표의 라이벌 매치 판정.
    const crossPairH2H = buildCrossPairH2H(confirmed.matches)
    const rivalMatchIds = new Set(
        matchGame.matches.filter((m) => isRivalMatch(m, crossPairH2H)).map((m) => m.id),
    )

    return (
        <MatchGameDetailContent
            matchGame={matchGame}
            members={membersWithFormer}
            isOwner={isOwner}
            ratingDeltaByMatch={byMatch}
            ratingChangeTotals={byUserTotal}
            ratingByUser={ratingByUser}
            rivalMatchIds={rivalMatchIds}
            currentUserId={user.id}
            formerMemberIds={formerMemberIds}
        />
    )
}
