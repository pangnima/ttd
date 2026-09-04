import { ClubCreateForm } from '@/components/clubs/club-create-form'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'

export default function NewClubPage() {
    return (
        <PageContainer>
            <div className="w-full max-w-xl space-y-6">
                <div className="space-y-3">
                    <PageHeader title="클럽 만들기" description="클럽을 만들면 자동으로 운영자가 됩니다." />

                    {/* 장식용 3분할 진행 바 */}
                    <div className="flex gap-1.5" aria-hidden="true">
                        <span className="h-1.5 flex-1 rounded-full bg-spot-solid" />
                        <span className="h-1.5 flex-1 rounded-full bg-spot-solid" />
                        <span className="h-1.5 flex-1 rounded-full bg-spot-solid" />
                    </div>
                </div>

                <ClubCreateForm />
            </div>
        </PageContainer>
    )
}
