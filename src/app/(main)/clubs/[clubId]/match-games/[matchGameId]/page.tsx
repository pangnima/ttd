import { MatchGameDetailContent } from '@/components/match-games/match-game-detail-content'

type MatchGameDetailPageProps = {
    params: Promise<{ clubId: string; matchGameId: string }>
}

export default async function MatchGameDetailPage({ params }: MatchGameDetailPageProps) {
    const { clubId, matchGameId } = await params
    return <MatchGameDetailContent clubId={clubId} matchGameId={matchGameId} />
}
