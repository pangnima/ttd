import { TournamentDetailContent } from '@/components/tournaments/tournament-detail-content'

type TournamentDetailPageProps = {
    params: Promise<{ clubId: string; tournamentId: string }>
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
    const { clubId, tournamentId } = await params
    return <TournamentDetailContent clubId={clubId} tournamentId={tournamentId} />
}
