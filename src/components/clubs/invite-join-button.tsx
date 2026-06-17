'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { joinViaInviteAction } from '@/lib/actions/club-members'

type Props = {
    token: string
}

// 초대 미리보기 화면에서 '가입하기' → 즉시 approved 멤버로 등록 후 클럽으로 이동.
export function InviteJoinButton({ token }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const onClick = () => {
        setError(null)
        startTransition(async () => {
            const result = await joinViaInviteAction(token)
            if ('error' in result) {
                setError(result.error)
                return
            }
            router.push(`/clubs/${result.clubId}`)
        })
    }

    return (
        <div className="space-y-2">
            <Button className="w-full gap-1.5" onClick={onClick} disabled={isPending}>
                <UserPlus className="w-4 h-4" />
                {isPending ? '가입 중…' : '가입하기'}
            </Button>
            {error && <p className="text-xs text-destructive text-center">{error}</p>}
        </div>
    )
}
