import { describe, expect, it } from 'vitest'
import {
    courtSlotOf,
    derivedSlotMinutes,
    effectiveCourtCount,
    roomSlotMinutes,
    groupByRound,
    restingByRound,
    roundConflictNames,
    roundStartLabels,
} from '@/lib/match-rooms/court-slots'

describe('effectiveCourtCount — 인원이 모자라면 면을 다 못 돌린다', () => {
    it('11명으로는 복식 3면을 동시에 돌릴 수 없다', () => {
        expect(effectiveCourtCount(11, 'men_doubles', 3)).toBe(2)
        expect(effectiveCourtCount(12, 'men_doubles', 3)).toBe(3)
    })

    it('인원이 넉넉해도 요청한 면 수를 넘지 않는다', () => {
        expect(effectiveCourtCount(20, 'men_doubles', 2)).toBe(2)
    })

    it('단식은 한 면에 두 자리', () => {
        expect(effectiveCourtCount(5, 'singles', 3)).toBe(2)
        expect(effectiveCourtCount(6, 'singles', 3)).toBe(3)
    })

    // 대진을 만들 수 없는 인원의 판정은 buildRoomLineup이 따로 한다 — 여기서는 0을 돌려주지 않는다
    it('대진을 못 만드는 인원이어도 최소 1', () => {
        expect(effectiveCourtCount(3, 'men_doubles', 2)).toBe(1)
        expect(effectiveCourtCount(0, 'men_doubles', 2)).toBe(1)
        expect(effectiveCourtCount(8, 'men_doubles', 0)).toBe(1)
    })
})

describe('courtSlotOf — 순서에서 라운드와 코트를 읽는다', () => {
    it('2면이면 두 게임씩 한 라운드', () => {
        expect(courtSlotOf(0, 2)).toEqual({ round: 1, court: 1 })
        expect(courtSlotOf(1, 2)).toEqual({ round: 1, court: 2 })
        expect(courtSlotOf(2, 2)).toEqual({ round: 2, court: 1 })
        expect(courtSlotOf(5, 2)).toEqual({ round: 3, court: 2 })
    })

    it('1면이면 라운드가 곧 게임이다', () => {
        expect(courtSlotOf(0, 1)).toEqual({ round: 1, court: 1 })
        expect(courtSlotOf(3, 1)).toEqual({ round: 4, court: 1 })
    })
})

describe('groupByRound', () => {
    it('면 수만큼 자른다 — 마지막 라운드는 모자랄 수 있다', () => {
        expect(groupByRound([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
        expect(groupByRound([1, 2, 3], 1)).toEqual([[1], [2], [3]])
        expect(groupByRound([], 2)).toEqual([])
    })
})

describe('roundStartLabels', () => {
    it('방 시작 시각에서 경기당 시간만큼 밀린다', () => {
        expect(roundStartLabels('10:00', 4, 30)).toEqual(['10:00', '10:30', '11:00', '11:30'])
    })

    it('초까지 온 값도 받는다 — DB time은 HH:MM:SS로 온다', () => {
        expect(roundStartLabels('10:00:00', 2, 45)).toEqual(['10:00', '10:45'])
    })

    it('자정을 넘으면 시각이 돌아간다', () => {
        expect(roundStartLabels('23:00', 3, 60)).toEqual(['23:00', '00:00', '01:00'])
    })

    it('시각이나 경기당 시간을 모르면 빈 배열 — 화면은 라운드 번호만 그린다', () => {
        expect(roundStartLabels(null, 3, 30)).toEqual([])
        expect(roundStartLabels('10:00', 3, null)).toEqual([])
        expect(roundStartLabels('10:00', 0, 30)).toEqual([])
    })
})

describe('derivedSlotMinutes — 저장된 방은 경기당 시간을 모른다', () => {
    it('예정 시간에 들어맞게 짠 대진은 방장이 고른 값과 같아진다', () => {
        expect(derivedSlotMinutes(120, 4)).toBe(30)
        expect(derivedSlotMinutes(90, 3)).toBe(30)
    })

    it('나누어떨어지지 않으면 5분 단위로 읽는다', () => {
        expect(derivedSlotMinutes(120, 5)).toBe(25) // 24분 → 25분
        expect(derivedSlotMinutes(100, 3)).toBe(35) // 33.3분 → 35분
    })

    it('모르면 null', () => {
        expect(derivedSlotMinutes(null, 4)).toBeNull()
        expect(derivedSlotMinutes(120, 0)).toBeNull()
    })
})

describe('restingByRound — 한 라운드 안에서 한 번도 안 뛴 사람만', () => {
    it('1번 코트에서 쉬고 2번 코트에서 뛰면 쉰 것이 아니다', () => {
        // 게임 0: c,d가 쉼 / 게임 1: a,b가 쉼 → 1라운드에 진짜 쉬는 사람은 없다
        expect(restingByRound([['c', 'd'], ['a', 'b']], 2)).toEqual([[]])
    })

    it('두 게임 모두에서 빠진 사람만 남는다', () => {
        expect(restingByRound([['c', 'e'], ['a', 'e']], 2)).toEqual([['e']])
    })

    it('1면이면 게임별 「쉼」 그대로', () => {
        expect(restingByRound([['c'], ['a']], 1)).toEqual([['c'], ['a']])
    })
})

describe('roundConflictNames — 한 라운드에 두 번 선 사람', () => {
    it('두 코트에 같은 이름이 있으면 잡아낸다', () => {
        expect(roundConflictNames([['a', 'b', 'c', 'd'], ['a', 'e', 'f', 'g']], 2)).toEqual([['a']])
    })

    it('멀쩡한 라운드는 빈 배열', () => {
        expect(roundConflictNames([['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h']], 2)).toEqual([[]])
    })

    // 한 게임 안의 중복은 validateDraft가 따로 막는다 — 라운드 판정이 그것까지 겹쳐 세면 안 된다
    it('한 게임 안에서 이름이 겹쳐도 라운드 충돌은 아니다', () => {
        expect(roundConflictNames([['a', 'a', 'c', 'd'], ['e', 'f', 'g', 'h']], 2)).toEqual([[]])
    })

    it('1면이면 충돌이 있을 수 없다', () => {
        expect(roundConflictNames([['a', 'b'], ['a', 'c']], 1)).toEqual([[], []])
    })
})

describe('roomSlotMinutes — 저장된 값이 역산을 이긴다 (0078, K-6)', () => {
    it('방이 값을 알면 그것을 쓴다 — 라운드 수·소요 시간과 무관하다', () => {
        // 30분으로 3라운드를 짠 120분 방: 역산은 40분이라 팝업(10:30)과 방(10:40)이 갈렸다
        expect(derivedSlotMinutes(120, 3)).toBe(40)
        expect(roomSlotMinutes(30, 120, 3)).toBe(30)
    })

    it('게임을 지워 라운드가 줄어도 저장된 값은 그대로다', () => {
        expect(roomSlotMinutes(30, 120, 2)).toBe(30)
        expect(roomSlotMinutes(30, 120, 5)).toBe(30)
    })

    it('저장된 값이 없으면 종전대로 역산한다 (0078 이전 방)', () => {
        expect(roomSlotMinutes(undefined, 120, 4)).toBe(30)
        expect(roomSlotMinutes(null, 120, 3)).toBe(40)
        expect(roomSlotMinutes(0, 120, 4)).toBe(30)
    })

    it('소요 시간도 없으면 null — 화면은 라운드 번호만 그린다', () => {
        expect(roomSlotMinutes(undefined, undefined, 3)).toBeNull()
        expect(roomSlotMinutes(null, null, 0)).toBeNull()
    })

    it('라운드 시각이 방장이 고른 값을 따른다', () => {
        expect(roundStartLabels('10:00', 3, roomSlotMinutes(30, 120, 3))).toEqual(['10:00', '10:30', '11:00'])
        // 저장 전 방은 역산이라 어긋난다 — 이것이 K-6이 말하던 증상이다
        expect(roundStartLabels('10:00', 3, roomSlotMinutes(null, 120, 3))).toEqual(['10:00', '10:40', '11:20'])
    })
})
