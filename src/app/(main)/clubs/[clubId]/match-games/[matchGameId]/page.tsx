// DB 재설계(Step2b) 임시 더미 데이터 스캐폴드 — 실제 Supabase 연동은 재설계 완료 후 복원한다.
import { notFound } from 'next/navigation'
import { augmentWithFormerMembers } from '@/lib/match-games/former-members'
import { buildCrossPairH2H, isRivalMatch } from '@/lib/match-games/special-match'
import { MatchGameDetailContent } from '@/components/match-games/match-game-detail-content'
import {
    FIXTURE_CURRENT_USER_ID,
    FIXTURE_MATCH_GAMES,
    FIXTURE_MEMBERS,
    FIXTURE_MEMBERSHIP,
    FIXTURE_RATINGS,
    FIXTURE_RATING_DELTAS,
    findFixtureMatchGame,
} from '@/lib/redesign-fixtures/match-games'

type MatchGameDetailPageProps = {
    params: Promise<{ clubId: string; matchGameId: string }>
}

export default async function MatchGameDetailPage({ params }: MatchGameDetailPageProps) {
    const { matchGameId } = await params

    const membership = FIXTURE_MEMBERSHIP
    const matchGame = findFixtureMatchGame(matchGameId)
    const members = FIXTURE_MEMBERS
    const ratingByUser = FIXTURE_RATINGS

    if (!matchGame) notFound()

    const isOwner = membership.role === 'owner'

    // 탈퇴(클럽/계정) 선수 이름 복원 + '탈퇴' 배지용 id 집합 (목록 페이지와 공통 헬퍼 사용).
    const { members: membersWithFormer, formerMemberIds } = await augmentWithFormerMembers(
        members,
        matchGame.matches,
    )

    // 확정 대진표만 레이팅 변동(▲/▼·요약) 표시.
    const { byMatch, byUserTotal } = matchGame.isFixed
        ? FIXTURE_RATING_DELTAS
        : { byMatch: undefined, byUserTotal: undefined }

    // 클럽 누적 cross-pair 전적 → 현재 대진표의 라이벌 매치 판정.
    const crossPairH2H = buildCrossPairH2H(FIXTURE_MATCH_GAMES.flatMap((mg) => mg.matches))
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
            currentUserId={FIXTURE_CURRENT_USER_ID}
            formerMemberIds={formerMemberIds}
        />
    )
}
