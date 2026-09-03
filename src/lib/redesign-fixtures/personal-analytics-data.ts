// 재설계 임시 픽스처 — "개인-데이터있음" 개인 통계 데이터셋. 실 Supabase 연동 복원 시 제거.
// 통계 단위는 세트(explodePersonalMatchSets)이므로 아래 세트 구성이 카드별 임계값을 직접 결정한다:
//   라이벌(selectRivals): 동일 상대 ≥3세트 & 무승부 제외 승률 45~55% → A 3W3L, B 2W2L, E 6W6L
//   파트너 케미(aggregatePartnerChemistry): 같은 파트너·같은 종목 ≥3세트 → 혼복 P1 6세트, 성별복식 P2 6세트
//   히트맵(aggregateHourHeatmap): today 기준 28/182일 창 → 날짜는 호출 시점에 오늘 기준 상대 생성, playedTime 전부 지정
//   표면 진단(diagnoseStrengthsWeaknesses): hard 다수승(강세) / clay 다수패(약세), 각 ≥3세트
//   손잡이(aggregateByOpponentHand): 회원 상대는 userMap.dominantHand, 외부 상대(C)는 opponentDominantHand
//   최근 폼/연승: 최신 레코드는 스트레이트 승 → 헤더 연승 표시
import type { CourtSurface, MatchType, PersonalMatch, PersonalMatchSetScore, User } from '@/types'
import { addDaysStr } from '@/lib/analytics/date-utils'

type Gender = User['gender']

type Player = {
    userId?: string
    name: string
    hand?: 'right' | 'left'
    ntrp?: number
}

type RecordOpts = {
    surface?: CourtSurface
    time: string
    partner?: Player
    opponent2?: Player
}

function fixtureUser(id: string, name: string, gender: Gender, hand: User['dominantHand'], ntrp: number): User {
    return {
        id,
        email: `${id}@example.com`,
        name,
        nickname: name,
        role: 'member',
        phone: '010-0000-0000',
        gender,
        dominantHand: hand,
        ntrp,
        tennisStartDate: '2022-03-01',
        createdAt: '2024-01-01T00:00:00Z',
        isGuest: false,
        statsHidden: false,
    }
}

/** '6-4 6-3' → 세트 배열. 복식은 세트마다 애드 코트를 번갈아 배정(코트 성향 카드용). */
function parseSets(scores: string, doubles: boolean): PersonalMatchSetScore[] {
    return scores.split(' ').map((s, i) => {
        const [me, opp] = s.split('-').map(Number)
        if (!doubles) return { me, opp }
        return { me, opp, myAd: i % 2 === 0 ? 'me' : 'partner', oppAd: i % 2 === 0 ? 'opponent' : 'opponent2' }
    })
}

type DataInput = {
    userId: string
    gender: Gender
    /** 'YYYY-MM-DD' — 모든 날짜는 이 값 기준 상대(daysAgo)로 생성 */
    today: string
}

export type PersonalAnalyticsData = {
    personalMatches: PersonalMatch[]
    /** 상대·파트너 회원 (userMap 구성용, 본인 제외) */
    users: User[]
}

export function buildDummyPersonalAnalyticsData({ userId, gender, today }: DataInput): PersonalAnalyticsData {
    const same: Gender = gender
    const opposite: Gender = gender === 'male' ? 'female' : 'male'
    const sameDoubles: MatchType = gender === 'female' ? 'women_doubles' : 'men_doubles'

    // 회원 상대/파트너
    const A = fixtureUser('fx-rival-a', '김민수', same, 'right', 3.0)
    const B = fixtureUser('fx-rival-b', '박지훈', same, 'left', 3.5)
    const D = fixtureUser('fx-opp-d', '정하늘', same, 'right', 2.5)
    const E = fixtureUser('fx-opp-e', '최유진', opposite, 'left', 2.5)
    const F = fixtureUser('fx-opp-f', '윤서준', same, 'right', 3.0)
    const G = fixtureUser('fx-opp-g', '강태오', same, 'right', 2.5)
    const P1 = fixtureUser('fx-partner-mixed', '오수아', opposite, 'right', 3.5)
    const P2 = fixtureUser('fx-partner-same', '한도윤', same, 'left', 3.0)
    const users = [A, B, D, E, F, G, P1, P2]

    const member = (u: User): Player => ({ userId: u.id, name: u.name, ntrp: u.ntrp })
    // 외부 상대(회원 아님) — 손잡이·NTRP를 레코드에 직접 보관
    const C: Player = { name: '이서연', hand: 'left', ntrp: 2.5 }

    let seq = 0
    const record = (daysAgo: number, opponent: Player, matchType: MatchType, scores: string, opts: RecordOpts): PersonalMatch => {
        const doubles = matchType !== 'singles'
        const sets = parseSets(scores, doubles)
        const playedAt = addDaysStr(today, -daysAgo)
        seq += 1
        return {
            id: `pa-${String(seq).padStart(2, '0')}`,
            userId,
            opponentName: opponent.name,
            opponentUserId: opponent.userId,
            opponentDominantHand: opponent.userId ? undefined : opponent.hand,
            opponentNtrp: opponent.ntrp,
            partnerUserId: opts.partner?.userId,
            partnerName: opts.partner?.name,
            partnerNtrp: opts.partner?.ntrp,
            opponent2UserId: opts.opponent2?.userId,
            opponent2Name: opts.opponent2?.name,
            opponent2Ntrp: opts.opponent2?.ntrp,
            playedAt,
            playedTime: opts.time,
            matchType,
            surface: opts.surface,
            setScores: sets,
            createdAt: `${playedAt}T${opts.time}:00Z`,
        }
    }

    const personalMatches: PersonalMatch[] = [
        // ── 단식 (hard 강세 / clay 약세 / grass·미지정 소량) ──
        record(1, member(A), 'singles', '6-4 6-3', { surface: 'hard', time: '19:00' }),
        record(3, member(D), 'singles', '6-2 6-1', { surface: 'hard', time: '20:00' }),
        record(5, C, 'singles', '6-3 4-6 6-4', { surface: 'hard', time: '10:00' }),
        record(8, member(B), 'singles', '4-6 3-6', { surface: 'clay', time: '19:00' }),
        record(12, member(A), 'singles', '3-6 4-6', { surface: 'clay', time: '20:00' }),
        record(15, member(E), 'singles', '6-2 6-4', { surface: 'hard', time: '07:00' }),
        // 헤더 최근 폼(aggregateRecentForm)은 분해본 게임 단위로 집계하므로 1세트씩 나눠 둔다
        record(20, member(A), 'singles', '7-5', { surface: 'grass', time: '10:00' }),
        record(22, member(A), 'singles', '5-7', { surface: 'grass', time: '19:00' }),
        record(26, member(B), 'singles', '6-3 6-4', { surface: 'hard', time: '19:00' }),
        record(40, member(D), 'singles', '6-4 6-2', { surface: 'hard', time: '20:00' }),
        record(55, C, 'singles', '6-3 6-2', { surface: 'hard', time: '19:00' }),
        record(70, member(E), 'singles', '6-4 3-6 4-6', { surface: 'clay', time: '10:00' }),
        record(95, member(D), 'singles', '6-4 6-4', { surface: 'hard', time: '19:00' }),
        record(120, member(E), 'singles', '3-6 6-2 4-6', { surface: 'grass', time: '07:00' }),
        record(150, member(D), 'singles', '6-3 6-4', { time: '20:00' }),
        // ── 혼복 (파트너 P1 고정, 6세트) ──
        record(2, member(F), 'mixed_doubles', '6-3 6-4', { surface: 'hard', time: '19:00', partner: member(P1), opponent2: member(E) }),
        record(10, member(D), 'mixed_doubles', '4-6 2-6', { surface: 'clay', time: '10:00', partner: member(P1), opponent2: member(E) }),
        record(33, member(G), 'mixed_doubles', '7-5 6-4', { surface: 'hard', time: '20:00', partner: member(P1), opponent2: member(E) }),
        // ── 성별 복식 (파트너 P2 고정, 6세트) ──
        record(4, member(F), sameDoubles, '6-4 6-3', { surface: 'hard', time: '07:00', partner: member(P2), opponent2: member(G) }),
        record(18, member(D), sameDoubles, '3-6 6-4 4-6', { surface: 'hard', time: '19:00', partner: member(P2), opponent2: member(F) }),
        record(60, member(G), sameDoubles, '6-2', { surface: 'grass', time: '10:00', partner: member(P2), opponent2: member(F) }),
    ]

    // ── 결과 미확정 (통계 제외, 목록 미리보기 배지 확인용) ──
    const pendingAt = addDaysStr(today, 0)
    personalMatches.push({
        id: 'pa-pending', userId, opponentName: A.name, opponentUserId: A.id, opponentNtrp: A.ntrp,
        playedAt: pendingAt, playedTime: '18:00', matchType: 'singles', surface: 'hard',
        setScores: [], createdAt: `${pendingAt}T18:00:00Z`,
    })
    const proposedAt = addDaysStr(today, -1)
    personalMatches.push({
        id: 'pa-proposed', userId, opponentName: B.name, opponentUserId: B.id, opponentNtrp: B.ntrp,
        playedAt: proposedAt, playedTime: '21:00', matchType: 'singles', surface: 'hard',
        setScores: [], sourceRequestId: 'fx-req-proposed',
        confirmation: {
            requestId: 'fx-req-proposed', status: 'proposed', proposedByMe: true,
            proposedSets: [{ me: 6, opp: 4 }, { me: 6, opp: 3 }],
        },
        createdAt: `${proposedAt}T21:00:00Z`,
    })

    return { personalMatches, users }
}
