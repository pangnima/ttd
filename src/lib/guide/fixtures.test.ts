import { describe, expect, it } from 'vitest'
import {
    GUIDE_CONFIRMATIONS, GUIDE_GAMES, GUIDE_INVITE, GUIDE_LIST_ROOMS, GUIDE_LIST_TURNS, GUIDE_MEMBERS_DETAIL,
    GUIDE_MY_ROOM, GUIDE_PERSONAL_MATCH, GUIDE_ROOM_DETAIL, GUIDE_ROOM_TURN, GUIDE_VIEWER_ID,
} from './fixtures'
import { OUTCOME_LABEL } from '@/lib/dashboard/outcome'
import { roomGameStatusBadge } from '@/lib/match-rooms/game-status'
import { buildRoomGameTeams } from '@/lib/match-rooms/game-labels'
import { viewerStatusLabel } from '@/lib/match-rooms/headcount'
import { GUEST_LABEL, HOST_LABEL, INVITED_LABEL, JOINED_LABEL } from '@/lib/match-rooms/member-labels'
import { buildMemberRows } from '@/lib/match-rooms/members-view'
import { roomStage } from '@/lib/match-rooms/room-stage'
import { classifyRoomGameTurn, isMyRoomTurn, ROOM_TURN_PILL } from '@/lib/match-rooms/room-turn'
import { buildRoomTitle } from '@/lib/match-rooms/title'
import { canReopenResult, canRespondToProposal } from '@/lib/personal-matches/confirmation'
import { resolveResultBadge } from '@/lib/personal-matches/result-badge'

/**
 * 가이드 픽스처는 **말하는 대로 보여야 한다** — 예시 옆의 글이 「결과 입력 표시」라고 하는데
 * 실제 판정이 다른 칩을 내면 그림이 글을 반박한다. 캡처와 달리 픽스처는 여기서 시끄럽게 낡는다.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const [g1, g2, g3] = GUIDE_GAMES
const c = (g: typeof g1) => (g.sourceRequestId ? GUIDE_CONFIRMATIONS[g.sourceRequestId] : undefined)

describe('매칭 리스트 카드', () => {
    it('첫 카드는 아직 안 들어간 노출 매칭 — 「비밀번호 입장」 칩 조건', () => {
        const r = GUIDE_LIST_ROOMS[0]
        expect(viewerStatusLabel(r.viewer)).toBeNull()
        expect(r.isListed).toBe(true)
        expect(GUIDE_LIST_TURNS.has(r.id)).toBe(false)
    })

    it('둘째 카드는 참가 중이고 「결과 입력」 필이 붙는다', () => {
        const r = GUIDE_LIST_ROOMS[1]
        expect(viewerStatusLabel(r.viewer)).toBe(JOINED_LABEL)
        const turn = GUIDE_LIST_TURNS.get(r.id)!
        expect(isMyRoomTurn(turn.turn)).toBe(true)
        expect(ROOM_TURN_PILL[turn.turn]).toBe('결과 입력')
    })
})

describe('참여 중인 매칭', () => {
    it('초대 카드 제목이 시작~종료 시각을 말한다', () => {
        expect(buildRoomTitle(GUIDE_INVITE)).toContain('18:00~20:00')
    })

    it('내 매칭 카드는 「호스트」 칩 + 「결과 확인」 필 — 차례는 실제 판정에서 파생됐다', () => {
        expect(viewerStatusLabel(GUIDE_MY_ROOM.viewer)).toBe(HOST_LABEL)
        expect(GUIDE_ROOM_TURN).toEqual({ turn: 'confirmResult', count: 1 })
    })
})

describe('게임 셋 — 결과 미입력 → 결과 확인 대기 → 확정', () => {
    it('1. 아직 아무도 입력 전: 배지 「결과 미입력」, 내 차례 = 결과 입력', () => {
        expect(roomGameStatusBadge(g1)?.label).toBe('결과 미입력')
        expect(classifyRoomGameTurn(g1, GUIDE_VIEWER_ID, c(g1))).toBe('enterResult')
        expect(buildRoomGameTeams(g1, GUIDE_VIEWER_ID)).toEqual({ mine: '나', theirs: '박지훈' })
    })

    it('2. 상대가 입력: 배지 「결과 확인 대기」, 내 차례 = 결과 확인', () => {
        expect(roomGameStatusBadge(g2)?.label).toBe('결과 확인 대기')
        expect(classifyRoomGameTurn(g2, GUIDE_VIEWER_ID, c(g2))).toBe('confirmResult')
        expect(canRespondToProposal(c(g2))).toBe(true)
    })

    it('3. 확정: 상태 배지 대신 「승」, 협상 정보가 없어 [결과 정정]도 그리지 않는다', () => {
        expect(roomGameStatusBadge(g3)).toBeNull()
        expect(resolveResultBadge(g3.setScores).label).toBe(OUTCOME_LABEL.win)
        expect(c(g3)).toBeUndefined()
        expect(canReopenResult(c(g3))).toBe(false)
        expect(classifyRoomGameTurn(g3, GUIDE_VIEWER_ID)).toBe('none')
    })

    it('매칭 단계는 진행 중', () => {
        expect(roomStage(GUIDE_ROOM_DETAIL)).toBe('playing')
    })
})

describe('명단·개인 경기', () => {
    it('명단이 네 상태를 순서대로 낸다', () => {
        expect(buildMemberRows(GUIDE_MEMBERS_DETAIL).map((r) => r.statusLabel))
            .toEqual([HOST_LABEL, JOINED_LABEL, INVITED_LABEL, GUEST_LABEL])
    })

    it('비회원은 뷰어가 부른 사람이 아니다 — 아니면 [빼기]가 그려진다', () => {
        expect(GUIDE_MEMBERS_DETAIL.guests.every((g) => g.createdBy !== GUIDE_VIEWER_ID)).toBe(true)
    })

    it('개인 경기 카드는 1세트 「승」 — 2세트부터는 배지가 「N게임 · …」으로 바뀐다', () => {
        expect(GUIDE_PERSONAL_MATCH.setScores).toHaveLength(1)
        expect(resolveResultBadge(GUIDE_PERSONAL_MATCH.setScores).label).toBe(OUTCOME_LABEL.win)
    })
})

it('모든 id가 UUID 모양이다 — 예시 링크의 프리페치가 잘못된 캐스트 로그를 남기지 않게', () => {
    const ids = [
        GUIDE_VIEWER_ID, GUIDE_INVITE.roomId, GUIDE_PERSONAL_MATCH.id, GUIDE_PERSONAL_MATCH.roomId,
        ...GUIDE_LIST_ROOMS.map((r) => r.id), ...GUIDE_GAMES.flatMap((g) => [g.id, g.sourceRequestId]),
        ...GUIDE_MEMBERS_DETAIL.members.map((m) => m.userId), ...GUIDE_MEMBERS_DETAIL.guests.map((g) => g.id),
    ]
    for (const id of ids) expect(id).toMatch(UUID)
})
