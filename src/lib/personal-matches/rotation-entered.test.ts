import { describe, expect, it } from 'vitest'
import {
    awaitingConsentNote, buildEnteredGames, enteredBadgeLabel, enteredGameLabel,
    enteredGameLine, summarizeEntered, type EnteredRotationGame,
} from '@/lib/personal-matches/rotation-entered'

function game(groupSeq: number, awaitingConsent = false): EnteredRotationGame {
    return {
        groupSeq,
        matchType: 'men_doubles',
        partnerName: '파트너',
        opponentName: '상대1',
        opponent2Name: '상대2',
        sets: [{ me: 6, opp: 3 }],
        awaitingConsent,
    }
}

describe('buildEnteredGames', () => {
    it('세션별로 묶고 groupSeq 오름차순으로 정렬한다', () => {
        const map = buildEnteredGames([
            { sessionId: 's1', game: game(3) },
            { sessionId: 's2', game: game(1) },
            { sessionId: 's1', game: game(1) },
            { sessionId: 's1', game: game(2) },
        ])
        expect(map.get('s1')?.map((g) => g.groupSeq)).toEqual([1, 2, 3])
        expect(map.get('s2')?.map((g) => g.groupSeq)).toEqual([1])
    })

    it('두 출처(기록·요청)를 한 목록으로 접는다 — 순번이 이어진다', () => {
        // 게임1은 전원 수락돼 personal_matches로, 게임2는 미수락이라 요청으로만 산다
        const map = buildEnteredGames([
            { sessionId: 's1', game: game(2, true) },
            { sessionId: 's1', game: game(1, false) },
        ])
        expect(map.get('s1')?.map((g) => [g.groupSeq, g.awaitingConsent])).toEqual([[1, false], [2, true]])
    })

    it('입력이 없으면 빈 맵', () => {
        expect(buildEnteredGames([]).size).toBe(0)
    })
})

describe('summarizeEntered', () => {
    it('총 건수와 수락 대기 건수를 센다', () => {
        expect(summarizeEntered([game(1, true), game(2), game(3, true)])).toEqual({ total: 3, awaiting: 2 })
    })
})

describe('enteredBadgeLabel', () => {
    it('입력이 없으면 종전 문구를 유지한다', () => {
        expect(enteredBadgeLabel([])).toBe('게임 미입력')
    })

    it('입력이 있으면 건수를 말한다 — 화면이 finalize 성공을 직접 알린다', () => {
        expect(enteredBadgeLabel([game(1), game(2)])).toBe('게임 2건 입력함')
    })
})

describe('awaitingConsentNote', () => {
    it('대기 게임이 없으면 줄을 그리지 않는다', () => {
        expect(awaitingConsentNote([game(1), game(2)], 0)).toBeUndefined()
    })

    it('대기 게임 수와 남은 회원 수를 함께 말한다', () => {
        expect(awaitingConsentNote([game(1, true), game(2)], 2))
            .toBe('입력한 게임 1건은 회원 2명이 수락하면 모두의 기록에 추가됩니다.')
    })

    it('남은 회원 수를 모르면 인원을 빼고 말한다', () => {
        expect(awaitingConsentNote([game(1, true)], 0))
            .toBe('입력한 게임 1건은 회원이 수락하면 모두의 기록에 추가됩니다.')
    })
})

describe('라벨', () => {
    it('게임 줄은 카드와 같은 팀 표기를 쓴다', () => {
        expect(enteredGameLine(game(1))).toBe('나 · 파트너 vs 상대1 · 상대2')
    })

    it('빈 이름은 미정으로 대체된다', () => {
        expect(enteredGameLine({ ...game(1), partnerName: '', opponent2Name: '' }))
            .toBe('나 · 파트너 미정 vs 상대1 · 상대2 미정')
    })

    it('순번 라벨은 index가 아니라 groupSeq를 쓴다 — 버킷이 갈려도 번호가 흔들리지 않는다', () => {
        expect(enteredGameLabel(game(7))).toBe('게임 7')
    })
})
