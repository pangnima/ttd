'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { recalculateClubRatings } from '@/lib/actions/ratings'

type Props = {
    clubId: string
}

// owner 전용 수동 재계산. 과거 확정 경기 백필·문제 발생 시 복구에 사용.
export function RecalculateRatingsButton({ clubId }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    const onClick = () => {
        setMessage(null)
        startTransition(async () => {
            const result = await recalculateClubRatings(clubId)
            if (result.ok) {
                setMessage({ ok: true, text: '레이팅을 재계산했습니다.' })
                router.refresh()
            } else {
                setMessage({ ok: false, text: result.error })
            }
        })
    }

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onClick} disabled={isPending}>
                <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                {isPending ? '재계산 중…' : '레이팅 재계산'}
            </Button>
            {message && (
                <span className={`text-xs ${message.ok ? 'text-emerald-500' : 'text-destructive'}`}>
                    {message.text}
                </span>
            )}
        </div>
    )
}
