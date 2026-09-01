import type { MatchRequestStatus } from '@/types'
import { PILL_BASE } from '@/lib/dashboard/tokens'

const STATUS_BADGE: Record<MatchRequestStatus, { label: string; className: string }> = {
    pending: { label: '대기 중', className: 'text-orange-600 dark:text-orange-400 border-orange-400/50' },
    accepted: { label: '수락됨', className: 'text-win border-win/50' },
    rejected: { label: '거절됨', className: 'text-muted-foreground border-border' },
    canceled: { label: '취소됨', className: 'text-muted-foreground border-border' },
}

export function RequestStatusBadge({ status }: { status: MatchRequestStatus }) {
    const s = STATUS_BADGE[status]
    return <span className={`${PILL_BASE} ${s.className}`}>{s.label}</span>
}
