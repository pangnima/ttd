import { describe, expect, it } from 'vitest'
import type { MatchRoomDetail } from '@/types'
import { buildMemberRows } from './members-view'

const base: MatchRoomDetail = {
    room: { id: 'r', hostUserId: 'h', sourceKind: 'rotation', playedAt: '2026-09-10', matchType: 'men_doubles', isSettled: false, createdAt: '' },
    host: { id: 'h', name: '호스트', nickname: 'host', deleted: false },
    viewer: { role: 'host', status: 'joined' },
    members: [
        { userId: 'p2', name: '입장자', nickname: '', deleted: false, role: 'player', status: 'joined', sourceRole: 'pool' },
        { userId: 'h', name: '호스트', nickname: 'host', deleted: false, role: 'host', status: 'joined' },
        { userId: 'd', name: '거절자', nickname: '', deleted: false, role: 'player', status: 'declined' },
        { userId: 'p', name: '참가자', nickname: '', deleted: false, role: 'player', status: 'joined' },
        { userId: 'i', name: '초대자', nickname: '', deleted: false, role: 'player', status: 'invited', sourceRole: 'pool' },
    ],
    source: { kind: 'rotation', isFinalized: false, pool: [{ name: '비회원A', ntrp: 3 }, { userId: 'p', name: '참가자' }] },
    games: [],
}

describe('buildMemberRows', () => {
    it('방장→참가→초대→비회원 순, 거절자는 제외', () => {
        const rows = buildMemberRows(base)
        expect(rows.map((r) => `${r.name}:${r.statusLabel}`)).toEqual([
            '호스트:방장', '입장자:참가', '참가자:참가', '초대자:초대 대기', '비회원A:비회원',
        ])
    })

    it('확인 요청 방은 수락 전 대표를 확인 대기로, 비회원 파트너는 비회원으로', () => {
        const rows = buildMemberRows({
            ...base,
            members: [base.members[1]],
            source: { kind: 'confirmation', requestStatus: 'pending', repName: '대표', repUserId: 'rep', participants: [{ role: 'partner', name: '내파트너' }] },
        })
        expect(rows.map((r) => `${r.name}:${r.statusLabel}`)).toEqual(['호스트:방장', '대표:확인 대기', '내파트너:비회원'])
    })

    it('게임 행의 비회원 참가자는 중복 없이 한 번만', () => {
        const rows = buildMemberRows({
            ...base,
            source: { kind: 'direct' },
            games: [
                { id: 'g1', matchType: 'singles', setScores: [], participants: [{ role: 'opponent', name: '외부상대' }], ownerUserId: 'h', ownerName: '호스트', sourceType: 'direct' as const },
                { id: 'g2', matchType: 'singles', setScores: [], participants: [{ role: 'opponent', name: '외부상대' }], ownerUserId: 'p', ownerName: '참가자', sourceType: 'direct' as const },
            ],
        })
        expect(rows.filter((r) => r.name === '외부상대')).toHaveLength(1)
    })
})
