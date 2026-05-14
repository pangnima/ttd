import { TournamentsPageContent } from '@/components/tournaments/tournaments-page-content'

type TournamentsPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function TournamentsPage({ params }: TournamentsPageProps) {
    const { clubId } = await params
    return <TournamentsPageContent clubId={clubId} />
}
