'use client'

import { useId, useTransition } from 'react'
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
        <div className="flex items-center gap-2">
            <label
                htmlFor={id}
                className={`text-[11px] transition-colors ${
                    hidden ? 'text-orange-400' : 'text-foreground/55'
                }`}
            >
                {hidden ? '비공개' : '공개'}
            </label>
            <Switch
                id={id}
                size="sm"
                checked={!hidden}
                onCheckedChange={handleChange}
                disabled={isPending}
            />
        </div>
    )
}
