import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchOpponentCandidates } from '@/lib/queries/users'
import { PersonalMatchForm } from '@/components/personal-matches/personal-match-form'
import { SECTION_LABEL } from '@/lib/dashboard/tokens'

export const metadata = { title: '경기 기록 추가' }

export default async function NewPersonalMatchPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const opponentCandidates = await fetchOpponentCandidates(user.id)

    return (
        <div className="space-y-6 max-w-lg">
            <div>
                <h1 className={`${SECTION_LABEL} text-2xl`}>경기 기록 추가</h1>
                <p className="text-sm text-foreground/60 mt-1">클럽 외부 경기를 직접 입력합니다</p>
            </div>
            <PersonalMatchForm opponentCandidates={opponentCandidates} />
        </div>
    )
}
