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
    participants?: Array<{
        role: string
        user_id: string | null
        /** 좌석 이름 스냅샷 — 관점 행 스냅샷(namedSeatsOf)이 비었을 때의 폴백 이름 */
        name?: string | null
        /** users 조인 — 탈퇴 판별용. 없으면 활성으로 본다(종전 동작) */
        user?: { deleted_at: string | null } | null
    }>
    /** 요청자·대표의 탈퇴 판별용 users 조인 (분모에서 빼야 명단에 유령 좌석이 안 생긴다) */
    requester?: { deleted_at: string | null } | null
    opponent?: { deleted_at: string | null } | null
    /**
     * 이 제안을 확인한 좌석의 user_id 배열 (0060, match_result_negotiations.confirmed_by).
     * 제안자는 제안 시점에 들어간다. 부착을 빠뜨리면 빈 배열 → `confirmedByMe=false`로 [결과 확인]이
     * 다시 뜨지만 RPC가 `result_already_confirmed_by_seat`로 거부하므로 역시 과다가 아니라 과소다.
     */
    confirmed_by?: string[] | null
    /**
     * 이의·정정으로 disputed를 만든 좌석의 user_id (0061). optional인 이유는 위와 같다 — 빠뜨리면
     * `disputedByMe=false`·이름 미상으로 떨어져 배지가 '이의 제기됨' 폴백 문구를 쓸 뿐, 차례 판정은 흔들리지 않는다.
     */
    disputed_by?: string | null
    /**
     * dispute/reopen 누적 횟수 (0062). optional인 이유는 위와 같다 — 빠뜨리면 `disputeRound=0`,
     * 즉 '이의를 거치지 않은 협상'으로 떨어져 종전 라우팅(내 차례 탭)이 되므로 실수가 **표시 과소**로 무너진다.
     */
    dispute_count?: number | null
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
 * 탈퇴(soft delete)한 좌석의 user_id. users 조인을 부착하지 않은 호출부에서는 빈 집합이 되어
 * 종전 동작(전원 활성으로 간주)으로 떨어진다 — 실수가 '분모 과다'로만 무너지도록.
 */
function inactiveSeatIds(row: ConfirmationSourceRow): Set<string> {
    const out = new Set<string>()
    if (row.requester?.deleted_at) out.add(row.requester_id)
    if (row.opponent?.deleted_at) out.add(row.opponent_user_id)
    for (const p of row.participants ?? []) {
        if (p.user_id && p.user?.deleted_at) out.add(p.user_id)
    }
    return out
}

/**
 * 확인 진행도의 분모 — user_id가 있는 **활성** 좌석(요청자·대표·회원 파트너·회원 상대2)의 distinct 수.
 * DB `request_result_seats`와 같은 규칙이다. 탈퇴자를 빼지 않으면 숫자가 1 어긋날 뿐 아니라,
 * 명단 표시(seat-status.ts)에서 **영영 오지 않을 확인을 기다리는 유령 좌석**이 생긴다.
 */
function memberSeatCount(row: ConfirmationSourceRow, inactive: Set<string>): number {
    const ids = new Set<string>([row.requester_id, row.opponent_user_id])
    for (const p of row.participants ?? []) if (p.user_id) ids.add(p.user_id)
    for (const id of inactive) ids.delete(id)
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
    const inactive = inactiveSeatIds(row)
    return {
        requestId: row.id,
        status: row.result_status as MatchResultStatus,
        proposedByMe: row.proposed_by === viewerId,
        confirmedByMe: confirmedBy.includes(viewerId),
        confirmProgress: { confirmed: confirmedBy.length, total: memberSeatCount(row, inactive) },
        confirmedUserIds: confirmedBy,
        proposedBy: row.proposed_by ?? undefined,
        inactiveUserIds: [...inactive],
        proposedSets: toSeatPerspective(proposed, seat),
        disputeReason: row.dispute_reason ?? undefined,
        disputedByMe: row.disputed_by === viewerId,
        disputedBy: row.disputed_by ?? undefined,
        disputeRound: row.dispute_count ?? 0,
        viewerIsParty: seat !== null,
    }
}

/**
 * 이 협상이 이의를 거쳤는가 — 「이의 처리」 탭 라우팅(queue.ts)과 재입력 맥락 배지의 단일 출처.
 *
 * `disputedBy`로 대신하지 않는다: `disputed_by`는 `on delete set null`이라 이의자가 탈퇴하면 표식이 사라져
 * 그 경기가 조용히 이의 탭에서 빠져나간다. 누적 카운터는 그 구멍을 막는다(0062).
 * 0061 이전에 이미 확정된 행은 카운터가 0이라 종전대로 취급된다(소급 없음).
 */
export function hasDisputeHistory(c?: PersonalMatchConfirmation): boolean {
    return (c?.disputeRound ?? 0) > 0
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
 * 제안된 결과에 **이의**를 제기할 수 있는가 — 확인보다 넓다. 이미 확인한 좌석도 정산 전이면 이의할 수 있다
 * (DB `dispute_match_result`는 제안자 본인만 거부하고 `confirmed_by`를 보지 않는다, 0060 §7).
 * 요구 "경기에 참여한 사람 모두 이의 신청 가능"의 앱쪽 거울이다. 확인 완료 카드의 [이의 제기] 버튼과
 * 협상 팝업의 검토 모드 진입이 이 술어를 본다(확인 버튼 노출은 여전히 canRespondToProposal).
 */
export function canDisputeProposal(c?: PersonalMatchConfirmation): boolean {
    if (!c) return false
    return c.status === 'proposed' && c.viewerIsParty && !c.proposedByMe
}

/**
 * 이의(disputed) 상태에서 '다시 입력할 차례'인가 — 큐 버킷(reenterResult)·이의 탭 섹션·카드 버튼 강조가
 * 이 한 문장을 본다. 차례는 **제안자**다: 제안이 곧 제안자의 확인이므로 틀린 제안을 한 사람이 고친다.
 * ⚠ `!disputedByMe`를 넣지 않는다 — dispute RPC가 제안자의 이의를 막아 그 조건은 이의 경로에서 항상 참이고,
 * 정정(reopen)에서 제안자 본인이 되돌리면 `proposedByMe && disputedByMe`라 아무도 차례가 아닌 교착이 된다.
 * 재제안 RPC는 좌석 누구나 통과시키므로 차례가 아닌 좌석에도 [다시 입력]은 남긴다(강조만 다르다).
 * proposed_by가 null인 disputed 행(하드 삭제 시에만)은 전원 대기지만, 그 outline 버튼이 있어 교착은 아니다.
 */
export function isReentryTurn(c?: PersonalMatchConfirmation): boolean {
    if (!c) return false
    return c.status === 'disputed' && c.viewerIsParty && c.proposedByMe
}

/** 이름 해석용 좌석 — 관점 행의 참가자 스냅샷(파트너·상대1·상대2)에서 만든다(labels.ts namedSeatsOf) */
export type NamedSeat = { userId?: string; name: string }

/**
 * 이의 제기자의 표시 이름 — 나면 '나', 좌석에서 찾으면 그 이름, 미상(0061 이전 행·좌석 밖)이면 undefined.
 *
 * 가드가 `status === 'disputed'`가 아니라 이의 **이력**인 것이 0062의 변경점이다 — 재제안으로 proposed가
 * 되어도 "누구의 이의에 대한 재입력인가"를 말해야 하므로 그 뒤에도 이름이 해석돼야 한다.
 */
/**
 * 제안자의 표시 이름 — 나면 '나', 좌석에서 찾으면 그 이름, 미상이면 undefined(0077).
 * 검토 팝업이 "OOO님이 제안한 결과"에 쓴다. 종전에는 상대팀 이름(formatOpponents)을 그 자리에 넣어
 * 복식에서 파트너가 제안하면 상대팀이 제안한 것처럼 읽혔다(E2E S4.7).
 */
/** 이의·정정 사유 상한 — DB dispute_reason_too_long과 같은 값. 이의 패널·정정 팝업이 함께 쓴다(F-6) */
export const REASON_MAX = 200

export function proposerNameOf(c: PersonalMatchConfirmation | undefined, seats: NamedSeat[]): string | undefined {
    if (!c) return undefined
    if (c.proposedByMe) return '나'
    if (!c.proposedBy) return undefined
    return seats.find((s) => s.userId && s.userId === c.proposedBy)?.name.trim() || undefined
}

export function disputerNameOf(c: PersonalMatchConfirmation | undefined, seats: NamedSeat[]): string | undefined {
    if (!c || !hasDisputeHistory(c)) return undefined
    if (c.disputedByMe) return '나'
    if (!c.disputedBy) return undefined
    return seats.find((s) => s.userId && s.userId === c.disputedBy)?.name.trim() || undefined
}

/**
 * 이의자 호칭 — '내' / 'OOO님' / '상대'(미상 폴백). 협상 팝업 설명줄과 카드의 사유 줄이 공유한다.
 * 두 곳에 인라인하면 한쪽만 고쳐졌을 때 같은 이의가 화면마다 다른 사람 것으로 보인다.
 */
export function disputerTitleOf(disputerName?: string): string {
    return disputerName === '나' ? '내' : disputerName ? `${disputerName}님` : '상대'
}

/**
 * 카드 본문에 그대로 읽히는 이의 사유 문구 — '내 이의 사유: 3게임 스코어가 다릅니다'.
 *
 * 0062까지 사유는 배지의 `title`(툴팁)에만 있어 모바일에서는 사실상 볼 수 없었고,
 * 버튼이 없는 버킷(재입력 결과 확인 대기)은 팝업 경로조차 없어 **끝내 읽을 방법이 없었다**.
 * 이의를 거치지 않았거나 사유가 없으면 undefined — 호출부에 조건문이 생기지 않도록.
 */
export function disputeReasonLine(
    c: PersonalMatchConfirmation | undefined, disputerName?: string,
): string | undefined {
    if (!c || !hasDisputeHistory(c) || !c.disputeReason) return undefined
    const prefix = c.status === 'disputed' ? '이의 사유' : '직전 이의 사유'
    return `${disputerTitleOf(disputerName)} ${prefix}: ${c.disputeReason}`
}

/** 이의 배지 문구 — '내가 이의 제기' / 'OOO님 이의' / '이의 제기됨'(미상 폴백). 툴팁은 사유 */
export function disputeBadge(c: PersonalMatchConfirmation, disputerName?: string): BystanderWaitingBadge {
    const label = disputerName === '나' ? '내가 이의 제기' : disputerName ? `${disputerName}님 이의` : '이의 제기됨'
    return { label, title: c.disputeReason ?? '제안 결과에 이의가 제기됐습니다' }
}

/**
 * 이의를 거친 뒤 다시 제안된 결과에 붙는 맥락 배지 (0062) — '내 이의 후 재입력' / 'OOO님 이의 후 재입력' /
 * '이의 후 재입력'(이의자 미상 폴백). 왕복이 두 번 이상이면 ' (N차)'를 붙여 몇 번째 재입력인지 말한다.
 * 툴팁은 직전 이의 사유 — 승인을 판단하는 데 필요한 유일한 정보다.
 */
export function reentryBadge(c: PersonalMatchConfirmation, disputerName?: string): BystanderWaitingBadge {
    const who = disputerName === '나' ? '내 이의' : disputerName ? `${disputerName}님 이의` : '이의'
    const round = c.disputeRound >= 2 ? ` (${c.disputeRound}차)` : ''
    return {
        label: `${who} 후 재입력${round}`,
        title: c.disputeReason
            ? `직전 이의 사유: ${c.disputeReason}`
            : '이의가 제기된 뒤 다시 입력된 결과입니다',
    }
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
