import { TournamentCreateForm } from '@/components/tournaments/tournament-create-form'

type NewTournamentPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function NewTournamentPage({ params }: NewTournamentPageProps) {
    const { clubId } = await params

    return (
        <div className="w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">대진표 작성</h1>
            </div>
            <TournamentCreateForm clubId={clubId} />
        </div>
    )
}
