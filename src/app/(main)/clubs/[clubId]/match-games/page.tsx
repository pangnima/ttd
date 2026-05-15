import { MatchGamesPageContent } from '@/components/match-games/match-games-page-content'

type MatchGamesPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MatchGamesPage({ params }: MatchGamesPageProps) {
    const { clubId } = await params
    return <MatchGamesPageContent clubId={clubId} />
}
