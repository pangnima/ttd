// DB 재설계(Step2b) 임시 더미 데이터 스캐폴드 — 실제 Supabase 연동은 재설계 완료 후 복원한다.
import { MatchGamesPageContent } from '@/components/match-games/match-games-page-content'
import { augmentWithFormerMembers } from '@/lib/match-games/former-members'
import {
    FIXTURE_CLUB,
    FIXTURE_CURRENT_USER_ID,
    FIXTURE_MATCH_GAMES,
    FIXTURE_MEMBERS,
    FIXTURE_MEMBERSHIP,
} from '@/lib/redesign-fixtures/match-games'

type MatchGamesPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MatchGamesPage({ params }: MatchGamesPageProps) {
    const { clubId } = await params

    const club = FIXTURE_CLUB
    const membership = FIXTURE_MEMBERSHIP
    const matchGames = FIXTURE_MATCH_GAMES
    const members = FIXTURE_MEMBERS

    const isMember = membership.status === 'approved'
    const isOwner = membership.role === 'owner'

    // 탈퇴(클럽/계정) 선수 이름 복원 — 모든 대진표의 경기에 등장한 선수를 보강한다.
    const { members: membersWithFormer, formerMemberIds } = await augmentWithFormerMembers(
        members,
        matchGames.flatMap((mg) => mg.matches),
    )

    return (
        <MatchGamesPageContent
            clubId={clubId}
            club={club}
            matchGames={matchGames}
            members={membersWithFormer}
            formerMemberIds={formerMemberIds}
            isMember={isMember}
            isOwner={isOwner}
            currentUserId={FIXTURE_CURRENT_USER_ID}
        />
    )
}
