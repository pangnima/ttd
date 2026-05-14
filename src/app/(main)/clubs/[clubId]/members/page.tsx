import { MembersContent } from '@/components/clubs/members-content'

type MembersPageProps = {
    params: Promise<{ clubId: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
    const { clubId } = await params

    return (
        <div className="w-full max-w-3xl">
            <MembersContent clubId={clubId} />
        </div>
    )
}
