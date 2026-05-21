'use client'

import { useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toggleStatsHiddenAction } from '@/lib/actions/profile'

type Props = {
    hidden: boolean
}

export function StatsPrivacyToggle({ hidden }: Props) {
    const [isPending, startTransition] = useTransition()

    function handleToggle() {
        startTransition(async () => {
            await toggleStatsHiddenAction(!hidden)
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={[
                'flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-all',
                hidden
                    ? 'border-orange-400/50 bg-orange-400/10 text-orange-300 hover:bg-orange-400/20'
                    : 'border-foreground/15 text-foreground/55 hover:border-foreground/30 hover:text-foreground/80',
                isPending ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
        >
            {hidden ? (
                <>
                    <EyeOff className="w-3 h-3" />
                    비공개
                </>
            ) : (
                <>
                    <Eye className="w-3 h-3" />
                    공개
                </>
            )}
        </button>
    )
}
