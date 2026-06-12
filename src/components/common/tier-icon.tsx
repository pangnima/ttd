import { tierIconSrc, getTier, TIER_LABELS, type RatingTier } from '@/lib/rating/tier'

type Props = {
    /** 계급 직접 지정. rating과 둘 중 하나. */
    tier?: RatingTier
    /** rating으로 계급 파생. */
    rating?: number
    /** 아이콘 높이(px). 엠블럼이 세로로 길어 height 기준, 폭은 비율 유지. 기본 16. */
    size?: number
    className?: string
}

// 계급 엠블럼 아이콘. 정적 SVG(public/tiers/{tier}.svg)를 <img>로 서빙해 그라디언트 ID 충돌을 피한다.
export function TierIcon({ tier, rating, size = 16, className }: Props) {
    const t = tier ?? (rating !== undefined ? getTier(rating) : 'gold')
    return (
        // 정적 SVG + 그라디언트 ID 격리 목적. next/image는 SVG 최적화 이점이 없어 <img> 사용.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={tierIconSrc(t)}
            alt={TIER_LABELS[t]}
            height={size}
            style={{ height: size, width: 'auto' }}
            className={className}
            draggable={false}
        />
    )
}
