'use client'

import { useId, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toggleStatsHiddenAction } from '@/lib/actions/profile'

type Props = {
    hidden: boolean
}

export function StatsPrivacyToggle({ hidden }: Props) {
    const [isPending, startTransition] = useTransition()
    const id = useId()

    // 스위치 ON = 공개(hidden=false), OFF = 비공개(hidden=true)
    function handleChange(checked: boolean) {
        startTransition(async () => {
            await toggleStatsHiddenAction(checked === false)
        })
    }

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1">
            <label
                htmlFor={id}
                className={`inline-flex items-center gap-1 text-xs transition-colors ${
                    hidden ? 'text-orange-400' : 'text-foreground/65'
                }`}
            >
                {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hidden ? '비공개' : '공개'}
            </label>
            <Switch
                id={id}
                size="default"
                checked={!hidden}
                onCheckedChange={handleChange}
                disabled={isPending}
            />
        </div>
    )
}
