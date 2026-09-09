import { describe, expect, it } from 'vitest'
import type { MatchRoomDetail } from '@/types'
import { buildMemberRows, memberMetaLine, type MemberRowView } from './members-view'

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
    guests: [],
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

describe('buildMemberRows — 방에 등록된 비회원(0069)', () => {
    const guest = { id: 'g1', name: '게스트김', ntrp: 3.5, hand: 'left' as const, createdBy: 'p' }

    it('게임에 오르기 전에도 명단에 비회원으로 뜨고 NTRP·손잡이를 갖는다', () => {
        const rows = buildMemberRows({ ...base, source: { kind: 'direct' }, guests: [guest] })
        const row = rows.find((r) => r.name === '게스트김')
        expect(row).toMatchObject({ statusLabel: '비회원', guestId: 'g1', guestCreatedBy: 'p', ntrp: 3.5, hand: 'left' })
    })

    it('같은 이름이 게임에도 나오면 한 행뿐이다 — 등록 행이 이긴다', () => {
        const rows = buildMemberRows({
            ...base,
            source: { kind: 'direct' },
            guests: [guest],
            games: [
                { id: 'g', matchType: 'singles', setScores: [], participants: [{ role: 'opponent', name: '게스트김' }], ownerUserId: 'h', ownerName: '호스트', sourceType: 'direct' as const },
            ],
        })
        const hits = rows.filter((r) => r.name === '게스트김')
        expect(hits).toHaveLength(1)
        expect(hits[0].guestId).toBe('g1')
    })

    it('로테이션 풀의 같은 이름도 두 줄이 되지 않는다', () => {
        const rows = buildMemberRows({ ...base, guests: [{ id: 'g2', name: '비회원A' }] })
        expect(rows.filter((r) => r.name === '비회원A')).toHaveLength(1)
    })
})

describe('memberMetaLine — 행 2줄째의 부가 정보', () => {
    const row = (extra: Partial<MemberRowView>): MemberRowView => ({
        key: 'm:x', name: 'X', statusLabel: '참가', ...extra,
    })

    it('닉네임 · 주력손 · 라켓을 잇는다', () => {
        expect(memberMetaLine(row({
            nickname: '길동이', hand: 'right', racketBrand: '윌슨', racketModel: '프로스태프',
        }))).toBe('길동이 · 오른손 · 윌슨 · 프로스태프')
    })

    it('빈 항목은 통째로 빠진다 — 자리 표시자를 남기지 않는다', () => {
        expect(memberMetaLine(row({ hand: 'left' }))).toBe('왼손')
        expect(memberMetaLine(row({ racketBrand: '바볼랏' }))).toBe('바볼랏')
        expect(memberMetaLine(row({ nickname: '닉' }))).toBe('닉')
    })

    it("라켓이 없으면 '미입력'이 새어 나오지 않는다 — 명단에 미입력이 늘어서면 소음이다", () => {
        const line = memberMetaLine(row({ nickname: '닉', hand: 'right' }))
        expect(line).toBe('닉 · 오른손')
        expect(line).not.toContain('미입력')
    })

    it('메타가 하나도 없는 비회원 행은 빈 문자열 — 컴포넌트가 줄을 통째로 생략한다', () => {
        expect(memberMetaLine(row({ key: 'g:게스트' }))).toBe('')
    })

    it('모르는 손잡이 값은 버린다', () => {
        expect(memberMetaLine(row({ hand: 'both' as unknown as 'right', nickname: '닉' }))).toBe('닉')
    })
})
