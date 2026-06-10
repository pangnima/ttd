import { Badge } from '@/components/ui/badge'

// 잠정기(확정 경기 <10) 레이팅임을 알리는 작은 뱃지. 랭킹·멤버 목록·프로필에서 공용.
export function ProvisionalBadge() {
    return (
        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-400/40">
            잠정
        </Badge>
    )
}
