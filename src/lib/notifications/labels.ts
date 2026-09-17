import type { Notification, NotificationPayload, NotificationType } from '@/types'
import { buildRoomTitle } from '@/lib/match-rooms/title'

/**
 * 알림 문구·링크의 단일 출처(Week 71). DB는 사건(type)과 스냅샷(payload)만 남기고 사람이 읽는 말은 여기서 만든다 —
 * 문구를 DB에 넣으면 어휘가 바뀔 때(방장→호스트, Week 54) 이미 쌓인 행이 낡는다.
 * 어휘 규칙: '방'은 '매칭', '강퇴'는 '내보내기'(member-labels.ts) — labels.test.ts가 가드한다.
 */
export type NotificationLabel = { title: string; body: string }

const who = (p: NotificationPayload, fallback = '상대') => p.actorName ?? fallback

const REMINDER_STAGE: Record<1 | 2, string> = {
    1: '2시간 뒤 시작합니다',
    2: '지금 시작합니다',
}

export const NOTIFICATION_LABEL: Record<NotificationType, (p: NotificationPayload) => NotificationLabel> = {
    room_invited: (p) => ({ title: '매칭 초대', body: `${who(p, '호스트')}님이 매칭에 초대했습니다.` }),
    invite_accepted: (p) => ({ title: '참가 수락', body: `${who(p)}님이 초대를 수락하고 참가했습니다.` }),
    invite_declined: (p) => ({ title: '초대 거절', body: `${who(p)}님이 초대를 거절했습니다.` }),
    room_entered: (p) => ({ title: '새 참가자', body: `${who(p)}님이 참가했습니다.` }),
    member_removed: () => ({ title: '매칭에서 내보내짐', body: '호스트가 매칭에서 내보냈습니다.' }),
    member_left: (p) => ({ title: '참가자 나감', body: `${who(p)}님이 매칭에서 나갔습니다.` }),
    result_proposed: (p) => ({
        title: p.revised ? '결과 다시 입력됨' : '결과 입력됨',
        body: `${who(p)}님이 결과를 ${p.revised ? '다시 ' : ''}입력했습니다. 확인해 주세요 — 24시간 동안 이의가 없으면 자동 확정됩니다.`,
    }),
    result_confirmed: (p) => ({ title: '결과 확정', body: `${who(p)}님이 확인해 결과가 확정됐습니다.` }),
    result_auto_confirmed: () => ({
        title: '결과 자동 확정',
        body: '24시간 동안 이의가 없어 결과가 자동 확정됐습니다. 정정이 필요하면 매칭에서 [결과 정정]을 눌러 주세요.',
    }),
    result_disputed: (p) => ({
        title: '이의 제기',
        body: `${who(p)}님이 결과에 이의를 제기했습니다.${p.disputeReason ? ` 사유: ${p.disputeReason}` : ''}`,
    }),
    result_reopen_requested: (p) => ({
        title: '결과 정정 요청',
        body: `${who(p)}님이 확정된 결과의 정정을 요청했습니다.${p.disputeReason ? ` 사유: ${p.disputeReason}` : ''}`,
    }),
    room_closed: () => ({ title: '매칭 마감', body: '호스트가 매칭을 마감했습니다. 기록은 더 이상 수정되지 않습니다.' }),
    lineup_saved: (p) => ({ title: '대진표 나옴', body: `호스트가 대진표를 저장했습니다${p.gameCount ? ` (${p.gameCount}게임)` : ''}.` }),
    lineup_changed: (p) => ({ title: '대진표 변경', body: `호스트가 대진표를 고쳤습니다${p.gameCount ? ` (${p.gameCount}게임)` : ''}.` }),
    room_deleted: () => ({ title: '매칭 취소', body: '호스트가 매칭을 내렸습니다.' }),
    invite_expired: (p) => ({ title: '초대 만료', body: `${p.inviteeName ?? '초대한 회원'}님이 응답하지 않아 초대가 만료됐습니다.` }),
    invite_reminder: (p) => ({
        title: '초대에 응답해 주세요',
        body: `초대받은 매칭이 ${REMINDER_STAGE[p.stage ?? 1]}. 아직 응답하지 않았습니다.`,
    }),
    room_tomorrow: (p) => ({ title: '내일 매칭', body: p.playedTime ? `내일 ${p.playedTime} 매칭이 있습니다.` : '내일 매칭이 있습니다.' }),
    result_missing: () => ({ title: '결과를 입력해 주세요', body: '경기가 끝났는데 아직 결과가 입력되지 않은 게임이 있습니다.' }),
    auto_confirm_reminder: () => ({
        title: '곧 자동 확정됩니다',
        body: '12시간 뒤 결과가 자동 확정됩니다. 다르면 지금 이의를 제기해 주세요.',
    }),
    reentry_reminder: () => ({ title: '결과를 다시 입력해 주세요', body: '이의가 제기된 지 하루가 지났습니다. 결과를 다시 입력해 주세요.' }),
}

export function notificationLabel(n: Pick<Notification, 'type' | 'payload'>): NotificationLabel {
    return NOTIFICATION_LABEL[n.type](n.payload)
}

/** 방 한 줄(9월 20일 10:00~12:00 · 코트 · 복식) — 스냅샷에 날짜·방식이 있을 때만 */
export function notificationTitleLine(p: NotificationPayload): string | null {
    if (!p.playedAt || !p.matchType) return null
    return buildRoomTitle({
        playedAt: p.playedAt,
        playedTime: p.playedTime,
        durationMinutes: p.durationMinutes,
        courtName: p.courtName,
        matchType: p.matchType,
    })
}

/** 눌렀을 때 갈 곳 — 방이 지워졌으면(room_id null) 내 기록·참여 중인 매칭으로 폴백 */
export function notificationHref(n: Pick<Notification, 'roomId' | 'requestId'>): string {
    if (n.roomId) return `/match-rooms/${n.roomId}`
    if (n.requestId) return '/me/personal-matches'
    return '/me/match-rooms'
}
