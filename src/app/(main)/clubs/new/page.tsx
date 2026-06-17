import { ClubCreateForm } from '@/components/clubs/club-create-form'
import { PageContainer } from '@/components/common/page-container'

export default function NewClubPage() {
    return (
        <PageContainer>
            <div className="w-full max-w-xl space-y-6">
                <div className="space-y-3">
                    <div>
                        <h1 className="text-2xl font-bold">클럽 만들기</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            클럽을 만들면 자동으로 운영자가 됩니다.
                        </p>
                    </div>

                    {/* 장식용 3분할 진행 바 */}
                    <div className="flex gap-1.5" aria-hidden="true">
                        <span className="h-1.5 flex-1 rounded-full bg-accent-lime" />
                        <span className="h-1.5 flex-1 rounded-full bg-accent-lime" />
                        <span className="h-1.5 flex-1 rounded-full bg-accent-lime" />
                    </div>
                </div>

                <ClubCreateForm />
            </div>
        </PageContainer>
    )
}
