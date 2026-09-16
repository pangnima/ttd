import { PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import {
    HOST_LABEL, INVITED_LABEL, JOINED_LABEL, PENDING_CONFIRM_LABEL,
} from '@/lib/match-rooms/member-labels'

/**
 * 회원 상태 칩·NTRP 배지의 클래스 — 룸 명단(RoomMemberRow)과 [회원 초대] 검색 결과 행(MemberResultRow)이 공유한다.
 * 같은 사람이 두 화면에서 다른 색으로 보이면 상태를 두 번 배워야 한다.
 *
 * 키가 곧 라벨 문자열이다 — member-labels의 상수를 계산 키로 써서 라벨과 색이 갈릴 자리를 없앤다.
 * 맵에 없는 라벨(내보내짐·나감·비회원)은 muted 폴백.
 */
export const MEMBER_STATUS_CLASS: Record<string, string> = {
    [HOST_LABEL]: 'border-primary/40 text-primary',
    [JOINED_LABEL]: 'border-win/40 text-win',
    [INVITED_LABEL]: 'border-spot/50 text-spot',
    [PENDING_CONFIRM_LABEL]: 'border-spot/50 text-spot',
}

export const MEMBER_STATUS_FALLBACK_CLASS = 'border-border text-muted-foreground'

export function memberStatusChipClass(label: string): string {
    return `${PILL_BASE} shrink-0 ${MEMBER_STATUS_CLASS[label] ?? MEMBER_STATUS_FALLBACK_CLASS}`
}

// NTRP는 이름 옆에 붙는다 — 실력이 곧 그 사람을 고르는 기준이라 이름과 한 덩어리로 읽혀야 한다.
// shrink-0이라 어떤 폭에서도 잘리지 않고, 잘리는 것은 언제나 이름 뒤의 메타(닉네임·라켓)다.
export const NTRP_BADGE = `${PILL_BASE} ${TYPO.micro} shrink-0 border-border text-foreground tabular-nums`
