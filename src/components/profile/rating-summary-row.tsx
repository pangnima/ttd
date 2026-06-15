import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type RatingSummary = {
    /** 자가선언 NTRP (users.ntrp). 0 이하면 미설정으로 보고 숨김 */
    selfNtrp: number
    /** 개인 경기 승패 기반 개인 레이팅 (개인 경기 있을 때만) */
    personal?: { rating: number; provisional: boolean }
    /** 가입 클럽별 본인 레이팅 (확정 경기 참여 클럽만) */
    clubs: Array<{ clubName: string; rating: number; provisional: boolean }>
}

type ChipProps = {
    label: string
    value: string
    provisional?: boolean
}

// 레이팅 단일 칩. 잠정(경기 수 부족)이면 흐리게 + 물결(~) 표식으로 추정값임을 알린다.
function RatingChip({ label, value, provisional }: ChipProps) {
    return (
        <Badge
            variant="outline"
            className={cn('gap-1 text-xs font-normal', provisional && 'opacity-70')}
            title={provisional ? '잠정 레이팅 (경기 수 부족)' : undefined}
        >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium tabular-nums">
                {provisional && '~'}
                {value}
            </span>
        </Badge>
    )
}

/**
 * 통합 탭 헤더용 레이팅 요약 행. 자가선언 NTRP · 개인 경기 레이팅 · 가입 클럽별 레이팅을
 * 한 줄(칩 묶음)로 노출한다. 성격이 다른 세 지표를 라벨로 구분해 한눈에 비교하게 한다.
 */
export function RatingSummaryRow({ selfNtrp, personal, clubs }: RatingSummary) {
    const hasSelf = selfNtrp > 0
    if (!hasSelf && !personal && clubs.length === 0) return null

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {hasSelf && <RatingChip label="자가" value={selfNtrp.toFixed(1)} />}
            {personal && (
                <RatingChip label="개인" value={personal.rating.toFixed(2)} provisional={personal.provisional} />
            )}
            {clubs.map((c) => (
                <RatingChip key={c.clubName} label={c.clubName} value={c.rating.toFixed(2)} provisional={c.provisional} />
            ))}
        </div>
    )
}
