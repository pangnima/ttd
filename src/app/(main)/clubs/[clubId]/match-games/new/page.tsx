import { MatchGameCreateForm } from '@/components/match-games/match-game-create-form'

type NewMatchGamePageProps = {
    params: Promise<{ clubId: string }>
}

export default async function NewMatchGamePage({ params }: NewMatchGamePageProps) {
    const { clubId } = await params

    return (
        <div className="w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">대진표 작성</h1>
            </div>
            <MatchGameCreateForm clubId={clubId} />
        </div>
    )
}
