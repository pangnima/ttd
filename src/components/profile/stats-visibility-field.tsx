'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { FORM_LABEL_BASE as labelCls } from '@/lib/dashboard/tokens'

/** 전적 통계 공개 여부 — 스위치 + 폼에 실리는 hidden input(`stats_hidden`) */
export function StatsVisibilityField({ initialHidden }: { initialHidden: boolean }) {
    const [statsHidden, setStatsHidden] = useState(initialHidden)

    return (
        <div>
            <p className={labelCls}>전적 통계 공개</p>
            <input type="hidden" name="stats_hidden" value={String(statsHidden)} />
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <label htmlFor="stats_public" className="text-body2 text-foreground cursor-pointer">
                    {statsHidden ? '비공개' : '공개'}
                </label>
                <Switch
                    id="stats_public"
                    checked={!statsHidden}
                    onCheckedChange={(checked) => setStatsHidden(checked === false)}
                />
            </div>
            <p className="text-caption text-muted-foreground mt-1.5">
                비공개 시 다른 회원이 내 프로필에서 승률·승무패를 볼 수 없습니다
            </p>
        </div>
    )
}
