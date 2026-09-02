import type { MatchRequest } from '@/types'

type Props = {
    request: MatchRequest
    counterpartName: string   // 상대측 대표 이름 (요청자 또는 수신자)
    viewerIsRequester: boolean
}

/**
 * 복식 확인 요청의 팀 구성 한 줄 — 보는 사람 관점 "나 · 파트너 vs 상대1 · 상대2".
 * 요청자 관점 저장값(partner=요청자 파트너, opponent2=상대팀 2번째)을 수신자면 교차한다. 단식이면 렌더하지 않는다.
 */
export function RequestTeamLine({ request, counterpartName, viewerIsRequester }: Props) {
    if (request.matchType === 'singles') return null
    const partner = request.partnerName ?? '파트너'
    const opponent2 = request.opponent2Name ?? '상대2'
    const myPartner = viewerIsRequester ? partner : opponent2
    const theirSecond = viewerIsRequester ? opponent2 : partner
    return (
        <p className="text-xs text-muted-foreground truncate">
            나 · <span className="text-primary">{myPartner}</span>
            <span className="mx-1">vs</span>
            <span className="text-foreground">{counterpartName}</span> · {theirSecond}
        </p>
    )
}
