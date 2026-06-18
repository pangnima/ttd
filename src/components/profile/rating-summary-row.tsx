import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PROVISIONAL_THRESHOLD } from '@/lib/rating/constants'

export type RatingSummary = {
    /** 자가선언 NTRP (users.ntrp). 0 이하면 미설정으로 보고 숨김 */
    selfNtrp: number
    /** 개인 경기 승패 기반 개인 레이팅 (개인 경기 있을 때만) */
    personal?: { rating: number; provisional: boolean; matchesPlayed: number }
    /** 가입 클럽별 본인 레이팅 (확정 경기 참여 클럽만) */
    clubs: Array<{ clubName: string; rating: number; provisional: boolean; matchesPlayed: number }>
}

type ChipProps = {
    label: string
    value: string
    provisional?: boolean
    /** 잠정 안내 문구 조립용 확정 경기 수 (없으면 일반 문구로 폴백) */
    matchesPlayed?: number
}

/**
 * 잠정 레이팅 안내 문구. 경기 수를 알면 "정착까지 N경기" 같은 구체 안내를,
 * 모르면 일반 문구를 돌려준다. 임계값은 PROVISIONAL_THRESHOLD 단일 출처를 따른다.
 */
function buildProvisionalHint(matchesPlayed?: number): string {
    if (matchesPlayed == null) return '잠정 레이팅 (경기 수 부족)'
    const remaining = Math.max(PROVISIONAL_THRESHOLD - matchesPlayed, 0)
    return `정착까지 ${remaining}경기 더 필요 · 현재 ${matchesPlayed}/${PROVISIONAL_THRESHOLD}경기 (개인 경기가 쌓이면 확정값으로 전환)`
}

// 레이팅 단일 칩. 잠정(경기 수 부족)이면 흐리게 + 물결(~) + '잠정' 라벨로 추정값임을 알린다.
function RatingChip({ label, value, provisional, matchesPlayed }: ChipProps) {
    const hint = provisional ? buildProvisionalHint(matchesPlayed) : undefined
    return (
        <Badge
            variant="outline"
            className={cn('gap-1 text-xs font-normal', provisional && 'opacity-70')}
            title={hint}
            aria-label={hint ? `${label} ${value} — ${hint}` : undefined}
        >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium tabular-nums">
                {provisional && '~'}
                {value}
            </span>
            {provisional && (
                <span className="text-[10px] font-normal text-muted-foreground" aria-hidden>
                    잠정
                </span>
            )}
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
                <RatingChip
                    label="개인"
                    value={personal.rating.toFixed(2)}
                    provisional={personal.provisional}
                    matchesPlayed={personal.matchesPlayed}
                />
            )}
            {clubs.map((c) => (
                <RatingChip
                    key={c.clubName}
                    label={c.clubName}
                    value={c.rating.toFixed(2)}
                    provisional={c.provisional}
                    matchesPlayed={c.matchesPlayed}
                />
            ))}
        </div>
    )
}
