import { NEUTRAL_PILL } from '@/lib/dashboard/tokens'

type Props = { label: string; title?: string }

/**
 * 진행도 배지 — '2/3명 수락'(참여 축, `formatAcceptanceProgress`)·'2/4명 확인'(결과 축, `formatConfirmProgress`).
 * 두 축이 같은 모양의 배지를 각자 갖고 있던 것을 하나로(Week 69). 라벨이 비면(단식·회원 1명) 그리지 않는다.
 */
export function ProgressBadge({ label, title }: Props) {
    if (!label) return null
    return <span className={`${NEUTRAL_PILL} tabular-nums`} title={title}>{label}</span>
}
