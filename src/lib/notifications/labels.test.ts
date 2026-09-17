import { describe, it, expect } from 'vitest'
import { NOTIFICATION_TYPES, type NotificationPayload } from '@/types'
import { NOTIFICATION_LABEL, notificationHref, notificationLabel, notificationTitleLine } from './labels'

const SNAPSHOT: NotificationPayload = {
    playedAt: '2026-09-20',
    playedTime: '10:00',
    durationMinutes: 120,
    matchType: 'men_doubles',
    courtName: '올림픽공원 3번',
    hostName: '호스트',
    actorName: '김철수',
}

// 노출 문구에서 물러난 어휘(Week 54) — 코드·DB 값은 그대로지만 사람에게는 매칭·호스트·내보내기다
const RETIRED_WORDS = ['방장', '강퇴', '클럽', '초대됨']

describe('NOTIFICATION_LABEL', () => {
    it('모든 타입에 제목·본문이 있다', () => {
        for (const type of NOTIFICATION_TYPES) {
            const label = NOTIFICATION_LABEL[type](SNAPSHOT)
            expect(label.title.length, type).toBeGreaterThan(0)
            expect(label.body.length, type).toBeGreaterThan(0)
        }
    })

    it('물러난 어휘를 쓰지 않는다', () => {
        for (const type of NOTIFICATION_TYPES) {
            const { title, body } = NOTIFICATION_LABEL[type]({ ...SNAPSHOT, stage: 2, disputeReason: '사유', inviteeName: '이름', gameCount: 3 })
            for (const word of RETIRED_WORDS) {
                expect(title, `${type}.title`).not.toContain(word)
                expect(body, `${type}.body`).not.toContain(word)
            }
        }
    })

    it('행위자 이름이 없어도(탈퇴·시스템) 문장이 선다', () => {
        const { body } = notificationLabel({ type: 'result_proposed', payload: {} })
        expect(body).toContain('상대님이')
    })

    it('자동 확정은 [결과 정정] 경로를 말한다', () => {
        expect(notificationLabel({ type: 'result_auto_confirmed', payload: {} }).body).toContain('[결과 정정]')
    })

    it('초대 독촉은 단계로 갈린다', () => {
        expect(notificationLabel({ type: 'invite_reminder', payload: { stage: 1 } }).body).toContain('2시간 뒤')
        expect(notificationLabel({ type: 'invite_reminder', payload: { stage: 2 } }).body).toContain('지금 시작')
    })

    it('D-1은 시각이 없으면 시각 없이 말한다', () => {
        expect(notificationLabel({ type: 'room_tomorrow', payload: { playedTime: '10:00' } }).body).toBe('내일 10:00 매칭이 있습니다.')
        expect(notificationLabel({ type: 'room_tomorrow', payload: {} }).body).toBe('내일 매칭이 있습니다.')
    })
})

describe('notificationTitleLine', () => {
    it('스냅샷이 있으면 방 한 줄, 없으면 null', () => {
        expect(notificationTitleLine(SNAPSHOT)).toContain('10:00~12:00')
        expect(notificationTitleLine(SNAPSHOT)).toContain('올림픽공원 3번')
        expect(notificationTitleLine({})).toBeNull()
    })
})

describe('notificationHref', () => {
    it('방이 있으면 룸, 지워졌으면 폴백', () => {
        expect(notificationHref({ roomId: 'r1', requestId: null })).toBe('/match-rooms/r1')
        expect(notificationHref({ roomId: null, requestId: 'q1' })).toBe('/me/personal-matches')
        expect(notificationHref({ roomId: null, requestId: null })).toBe('/me/match-rooms')
    })
})
