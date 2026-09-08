import type { MatchResultStatus, PersonalMatchConfirmation, PersonalMatchSetScore } from '@/types'
import { invertSetScores, swapPartnerPerspective } from '@/lib/personal-matches/perspective'

/** match_requests에서 결과 확인 상태를 만들 때 필요한 최소 컬럼 (queries/personal-matches가 select) */
export type ConfirmationSourceRow = {
    id: string
    requester_id: string
    /** 상대팀 대표 — 요청의 상대 슬롯을 차지한 사람. 0059부터 '확인할 수 있는 유일한 사람'은 아니다 */
    opponent_user_id: string
    result_status: string
    proposed_by: string | null
    proposed_set_scores: unknown
    dispute_reason: string | null
    /**
     * 복식 좌석(partner·opponent2). **optional인 것이 안전 설계다** — 부착을 빠뜨린 호출부에서는
     * 좌석이 null로 떨어져 `viewerIsParty=false`, 즉 실수가 **권한 과다가 아니라 과소로** 무너진다.
     */
    participants?: Array<{ role: string; user_id: string | null }>
    /**
     * 이 제안을 확인한 좌석의 user_id 배열 (0060, match_result_negotiations.confirmed_by).
     * 제안자는 제안 시점에 들어간다. 부착을 빠뜨리면 빈 배열 → `confirmedByMe=false`로 [결과 확인]이
     * 다시 뜨지만 RPC가 `result_already_confirmed_by_seat`로 거부하므로 역시 과다가 아니라 과소다.
     */
    confirmed_by?: string[] | null
}

/** 결과 협상 축의 좌석 — DB `request_seat_of`(0059)의 앱쪽 거울. 판정 순서까지 같아야 한다. */
type ResultSeat = 'requester' | 'opponent' | 'partner' | 'opponent2'

function seatOf(row: ConfirmationSourceRow, userId: string | null): ResultSeat | null {
    if (!userId) return null
    if (row.requester_id === userId) return 'requester'
    if (row.opponent_user_id === userId) return 'opponent'
    const seat = row.participants?.find((p) => p.user_id === userId)
    if (seat?.role === 'partner') return 'partner'
    if (seat?.role === 'opponent2') return 'opponent2'
    return null
}

/**
 * 저장된 요청자 관점 스코어를 **보는 사람 좌석의 관점**으로 옮긴다.
 * 요청자=그대로 / 파트너=`P`(팀 안쪽) / 대표=`I`(팀 가로) / 상대2=`P∘I`.
 * ⚠ 상대2의 역방향(제안 정규화)은 순서가 반대(`I∘P`)이고 그건 SQL이 한다(0059) — 여기서 흉내내지 말 것.
 */
function toSeatPerspective(sets: PersonalMatchSetScore[], seat: ResultSeat | null): PersonalMatchSetScore[] {
    if (seat === 'requester') return sets
    if (seat === 'partner') return swapPartnerPerspective(sets)
    if (seat === 'opponent2') return swapPartnerPerspective(invertSetScores(sets))
    // 대표와 좌석 미상(참가자 미부착)은 종전대로 반전 — 상대 관점이 기본값이었다
    return invertSetScores(sets)
}

/**
 * 확인 진행도의 분모 — user_id가 있는 좌석(요청자·대표·회원 파트너·회원 상대2)의 distinct 수.
 * DB `request_result_seats`는 여기에 활성 회원 조건이 더 붙는다(탈퇴자 제외). 앱은 탈퇴 여부를 모르므로
 * 표시가 1 어긋날 수 있지만, 정산 판정은 어디까지나 DB가 한다.
 */
function memberSeatCount(row: ConfirmationSourceRow): number {
    const ids = new Set<string>([row.requester_id, row.opponent_user_id])
    for (const p of row.participants ?? []) if (p.user_id) ids.add(p.user_id)
    return ids.size
}

/**
 * match_requests 행을 보는 사람(viewer) 관점의 PersonalMatchConfirmation으로 변환한다.
 *
 * 0060부터 확인은 **좌석별 만장일치**다 — 좌석 넷(요청자·파트너·대표·상대2) 전원이 제안·확인·이의를
 * 할 수 있고, 제안은 제안자의 확인을 겸하며, 나머지 회원 좌석 전원이 확인해야 정산된다. 그래서 화면의
 * 검토 모드 판정은 `canRespondToProposal`(제안자도 아니고 아직 확인도 안 한 좌석)이 단일 출처다.
 */
export function buildConfirmation(row: ConfirmationSourceRow, viewerId: string): PersonalMatchConfirmation {
    const proposed = Array.isArray(row.proposed_set_scores)
        ? (row.proposed_set_scores as PersonalMatchSetScore[])
        : []
    const seat = seatOf(row, viewerId)
    const confirmedBy = row.confirmed_by ?? []
    return {
        requestId: row.id,
        status: row.result_status as MatchResultStatus,
        proposedByMe: row.proposed_by === viewerId,
        confirmedByMe: confirmedBy.includes(viewerId),
        confirmProgress: { confirmed: confirmedBy.length, total: memberSeatCount(row) },
        proposedSets: toSeatPerspective(proposed, seat),
        disputeReason: row.dispute_reason ?? undefined,
        viewerIsParty: seat !== null,
    }
}

/**
 * 제안된 결과를 내가 확인·이의할 수 있는가 — 큐 버킷(confirmResult)·카드·룸 행의 검토 모드가 전부
 * 이 한 문장을 본다. RPC의 통과 조건(좌석 보유 · proposed · 제안자 아님 · 아직 미확인)과 같다.
 * 빠뜨리면 눌렀을 때 RPC가 튕기는 버튼이 뜬다.
 */
export function canRespondToProposal(c?: PersonalMatchConfirmation): boolean {
    if (!c) return false
    return c.status === 'proposed' && c.viewerIsParty && !c.proposedByMe && !c.confirmedByMe
}

/**
 * '2/4명 확인'. 회원 좌석이 둘 이하(단식)면 진행도라는 개념이 없어 빈 문자열 — 렌더하지 않는다.
 * 문구 형식은 참여 축의 formatAcceptanceProgress('2/3명 수락')와 맞춘다.
 */
export function formatConfirmProgress(c?: PersonalMatchConfirmation): string {
    if (!c || c.status !== 'proposed') return ''
    const { confirmed, total } = c.confirmProgress
    return total <= 2 ? '' : `${confirmed}/${total}명 확인`
}

/** 요청 당사자가 아닌 참가자에게 보여줄 대기 배지 (문구 + 툴팁) */
export type BystanderWaitingBadge = { label: string; title: string }

const SEAT_WAITING: BystanderWaitingBadge = {
    label: '참가자 확인 대기',
    title: '이 경기의 결과는 회원 참가자 전원이 확인하면 확정됩니다',
}

/**
 * 협상 자격이 없는 관점 행에 붙는 읽기 전용 배지.
 *
 * ⚠ 0059로 좌석 넷 전원이 협상 자격을 얻으면서 이 배지는 **폴백 전용**이 됐다 — 참가자 임베드를
 * 빠뜨린 조회 경로나 좌석 판정 실패(참가자 user_id가 빈 비회원 슬롯)에서만 도달한다.
 * 죽은 코드처럼 보이지만 지우면 그 경로들이 조용히 깨지므로 남겨 둔다.
 * (내가 이미 확인해 남은 좌석을 기다리는 상태는 이것이 아니라 화면의 별도 분기가 담당한다.)
 */
export function bystanderWaitingBadge(c?: PersonalMatchConfirmation): BystanderWaitingBadge {
    if (!c) return SEAT_WAITING
    if (c.status === 'none') {
        return { label: '결과 입력 대기', title: '아직 아무도 결과를 제안하지 않았습니다' }
    }
    if (c.status === 'disputed') {
        return {
            label: '이의 제기됨',
            title: c.disputeReason ?? '제안된 결과에 이의가 제기돼 다시 입력을 기다립니다',
        }
    }
    if (c.status === 'proposed') {
        return { label: '참가자 확인 대기', title: '결과가 제안됐습니다. 회원 참가자 전원이 확인하면 확정됩니다' }
    }
    // confirmed인데 세트가 비어 있는 조합은 존재할 수 없다 — 방어적 폴백
    return SEAT_WAITING
}

/**
 * 확정된 결과를 다시 협상 상태로 되돌릴 수 있는가(0055 reopen_match_result).
 *
 * 조건은 RPC의 통과 조건과 같다 — 상호 확인 경기(requestId 있음) · 결과 확정 상태 ·
 * 뷰어가 이 요청의 좌석 중 하나(0059부터 파트너·상대2 포함). 확인할 수 있는 사람이 되돌릴 수도 있어야 일관된다.
 * 자유 기록은 애초에 본인이 수정·삭제할 수 있으므로 이 경로가 필요 없다.
 */
export function canReopenResult(c?: PersonalMatchConfirmation): boolean {
    if (!c) return false
    return c.status === 'confirmed' && c.viewerIsParty
}
