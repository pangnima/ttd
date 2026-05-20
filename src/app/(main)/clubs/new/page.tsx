import { ClubCreateForm } from '@/components/clubs/club-create-form'

export default function NewClubPage() {
    return (
        <div className="w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">클럽 만들기</h1>
                <p className="text-sm text-foreground/60 mt-1">
                    클럽을 만들면 자동으로 운영자가 됩니다.
                </p>
            </div>

            <ClubCreateForm />
        </div>
    )
}
