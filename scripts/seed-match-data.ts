/**
 * 테스트용 랜덤 경기 데이터 시딩.
 *   - 기존 6개 클럽/52명 회원 기준으로 대진표 100개(다양한 매치타입) + 개인경기 생성
 *   - 모든 클럽 경기는 is_fixed=true, finished, 결과 포함 → 통계/레이팅 반영
 *   - 결과는 팀 평균 NTRP 차로 승률을 가중 → 강/약 상대·NTRP 차등 카드가 자연 형성
 *   - 마지막에 영향 클럽 레이팅을 앱 엔진(replayClubRatings)으로 재계산
 *
 * 식별 태그 [시드] 로 생성물을 표시한다(롤백: clear-seed-data.ts).
 * 실행: npx tsx scripts/seed-match-data.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    createAdminClient,
    recalcClubRatings,
    SEED_TAG,
    randInt,
    pick,
    chance,
    weightedPick,
    randomRecentDate,
} from './_seed-shared'
import { resolveMatchWinner } from '../src/lib/personal-matches/winner'
import type { CourtSurface, MatchType, PersonalMatchSetScore } from '../src/types'

// ── 설정 ────────────────────────────────────────────────
// 추가 보강 시 SEED_GAMES 환경변수로 대진표 수 조절 가능(기본 100).
const TOTAL_MATCH_GAMES = Number(process.env.SEED_GAMES) || 100
const MIN_MEMBERS_FOR_CLUB = 4 // 복식 가능 최소 인원

type Member = {
    id: string
    nickname: string
    gender: 'male' | 'female'
    ntrp: number
    hand: 'right' | 'left'
}
type ClubPool = {
    id: string
    name: string
    short: string
    males: Member[]
    females: Member[]
    size: number
}

// ── 결과(세트 스코어) 생성 ──────────────────────────────
type SetScore = { team1: number; team2: number }
type Result = { sets: SetScore[]; winnerId: 'team1' | 'team2' | 'draw' }

function makeSetScore(team1Wins: boolean): SetScore {
    let w = 6
    let l = randInt(5) // 0~4
    if (chance(0.15)) {
        // 접전: 7-5 / 7-6
        w = 7
        l = chance(0.5) ? 5 : 6
    }
    return team1Wins ? { team1: w, team2: l } : { team1: l, team2: w }
}

function genResult(team1Avg: number, team2Avg: number): Result {
    // 무승부 소량(검증용). 동점 세트로 표현.
    if (chance(0.03)) {
        const g = 4 + randInt(3)
        return { sets: [{ team1: g, team2: g }], winnerId: 'draw' }
    }
    // ELO 기대 승률(스케일 D=1.0)로 강팀이 더 자주 승리.
    const pTeam1 = 1 / (1 + Math.pow(10, (team2Avg - team1Avg) / 1.0))
    const team1Wins = chance(pTeam1)
    const setCount = weightedPick([
        [1, 5],
        [2, 3],
        [3, 2],
    ])
    const sets: SetScore[] = []
    for (let i = 0; i < setCount; i++) sets.push(makeSetScore(team1Wins))
    return { sets, winnerId: team1Wins ? 'team1' : 'team2' }
}

const surfacePick = (): CourtSurface =>
    weightedPick<CourtSurface>([
        ['hard', 60],
        ['clay', 25],
        ['grass', 10],
        ['other', 5],
    ])

const teamAvg = (members: Member[]): number =>
    members.reduce((s, m) => s + m.ntrp, 0) / members.length

// ── 매치 1건 구성 ───────────────────────────────────────
type MatchPayload = {
    match_type: MatchType
    player1_id: string | null
    player2_id: string | null
    team1: string[] | null
    team2: string[] | null
    team1_ad_player_id: string | null
    team2_ad_player_id: string | null
    status: 'finished'
    result_sets: SetScore[]
    winner_id: 'team1' | 'team2' | 'draw'
}

/** 슬롯 내 중복 출전을 피하며 가능한 매치타입 중 하나를 구성. 불가하면 null. */
function buildMatch(pool: ClubPool, used: Set<string>): MatchPayload | null {
    const availM = pool.males.filter((m) => !used.has(m.id))
    const availF = pool.females.filter((m) => !used.has(m.id))

    const opts: Array<[MatchType | 'singles_f', number]> = []
    if (availM.length >= 2) opts.push(['singles', 4]) // 남자 단식
    if (availF.length >= 2) opts.push(['singles_f', 2]) // 여자 단식
    if (availM.length >= 4) opts.push(['men_doubles', 3])
    if (availF.length >= 4) opts.push(['women_doubles', 2])
    if (availM.length >= 2 && availF.length >= 2) opts.push(['mixed_doubles', 3])
    if (opts.length === 0) return null

    const kind = weightedPick(opts)
    const take = (arr: Member[], n: number): Member[] => {
        const chosen: Member[] = []
        const bag = [...arr]
        for (let i = 0; i < n; i++) {
            const idx = randInt(bag.length)
            chosen.push(bag[idx])
            bag.splice(idx, 1)
        }
        chosen.forEach((m) => used.add(m.id))
        return chosen
    }

    const base = {
        team1_ad_player_id: null as string | null,
        team2_ad_player_id: null as string | null,
        status: 'finished' as const,
    }

    if (kind === 'singles' || kind === 'singles_f') {
        const [p1, p2] = take(kind === 'singles' ? availM : availF, 2)
        const r = genResult(p1.ntrp, p2.ntrp)
        return {
            ...base,
            match_type: 'singles',
            player1_id: p1.id,
            player2_id: p2.id,
            team1: null,
            team2: null,
            result_sets: r.sets,
            winner_id: r.winnerId,
        }
    }

    // 복식
    let t1: Member[]
    let t2: Member[]
    if (kind === 'men_doubles') {
        const four = take(availM, 4)
        t1 = four.slice(0, 2)
        t2 = four.slice(2, 4)
    } else if (kind === 'women_doubles') {
        const four = take(availF, 4)
        t1 = four.slice(0, 2)
        t2 = four.slice(2, 4)
    } else {
        // mixed: 각 팀 남1 여1
        const m2 = take(availM, 2)
        const f2 = take(availF, 2)
        t1 = [m2[0], f2[0]]
        t2 = [m2[1], f2[1]]
    }
    const r = genResult(teamAvg(t1), teamAvg(t2))
    // 듀스/애드 카드용: 70% 확률로 애드코트 담당 지정.
    const ad = chance(0.7)
    return {
        ...base,
        match_type: kind as MatchType,
        player1_id: null,
        player2_id: null,
        team1: t1.map((m) => m.id),
        team2: t2.map((m) => m.id),
        team1_ad_player_id: ad ? pick(t1).id : null,
        team2_ad_player_id: ad ? pick(t2).id : null,
        result_sets: r.sets,
        winner_id: r.winnerId,
    }
}

// ── 대진표 1개 생성 ─────────────────────────────────────
async function createMatchGame(sb: SupabaseClient, pool: ClubPool): Promise<number> {
    const date = randomRecentDate()
    const { data: mg, error: mgErr } = await sb
        .from('match_games')
        .insert({ club_id: pool.id, name: `${SEED_TAG} ${pool.short} ${date} 리그`, date, is_fixed: true })
        .select('id')
        .single()
    if (mgErr || !mg) throw mgErr ?? new Error('match_game insert 실패')
    const mgId = mg.id as string

    // 코트
    const courtCount = 1 + randInt(3) // 1~3
    const courtsPayload = Array.from({ length: courtCount }, (_, i) => ({
        match_game_id: mgId,
        label: `${i + 1}코트`,
        order: i + 1,
        surface: surfacePick(),
    }))
    const { data: courts, error: cErr } = await sb
        .from('match_game_courts')
        .insert(courtsPayload)
        .select('id')
    if (cErr || !courts) throw cErr ?? new Error('courts insert 실패')

    // 라운드
    const roundCount = 2 + randInt(3) // 2~4
    const roundsPayload = Array.from({ length: roundCount }, (_, i) => ({
        match_game_id: mgId,
        label: `${i + 1}회전`,
        order: i + 1,
    }))
    const { data: rounds, error: rErr } = await sb
        .from('match_game_rounds')
        .insert(roundsPayload)
        .select('id, order')
    if (rErr || !rounds) throw rErr ?? new Error('rounds insert 실패')

    // 타임슬롯(라운드별 1~2개)
    const slotsPayload: Array<{ round_id: string; start_at: string; end_at: string }> = []
    for (const round of rounds) {
        const slotCount = 1 + randInt(2)
        const baseHour = 8 + (round.order as number) // 9시부터 라운드별 +1
        for (let s = 0; s < slotCount; s++) {
            const hh = String(baseHour).padStart(2, '0')
            const start = s === 0 ? `${hh}:00` : `${hh}:30`
            const end = s === 0 ? `${hh}:30` : `${String(baseHour + 1).padStart(2, '0')}:00`
            slotsPayload.push({ round_id: round.id as string, start_at: start, end_at: end })
        }
    }
    const { data: slots, error: sErr } = await sb
        .from('match_game_time_slots')
        .insert(slotsPayload)
        .select('id, round_id')
    if (sErr || !slots) throw sErr ?? new Error('time_slots insert 실패')

    // 경기: (라운드 → 슬롯 → 코트) 격자를 채우되 슬롯 단위로 선수 중복 방지
    const matchesPayload: Array<Record<string, unknown>> = []
    let order = 1
    for (const round of rounds) {
        const roundSlots = slots.filter((sl) => sl.round_id === round.id)
        for (const slot of roundSlots) {
            const used = new Set<string>()
            for (const court of courts) {
                const m = buildMatch(pool, used)
                if (!m) break // 더 채울 선수가 없으면 이 슬롯 종료
                matchesPayload.push({
                    match_game_id: mgId,
                    round_id: round.id,
                    court_id: court.id,
                    time_slot_id: slot.id,
                    order: order++,
                    ...m,
                })
            }
        }
    }
    if (matchesPayload.length > 0) {
        const { error: mErr } = await sb.from('match_game_matches').insert(matchesPayload)
        if (mErr) throw mErr
    }
    return matchesPayload.length
}

// ── 개인경기 생성 ───────────────────────────────────────
function makePersonalSets(): PersonalMatchSetScore[] {
    const count = weightedPick([
        [1, 5],
        [2, 3],
        [3, 2],
    ])
    const sets: PersonalMatchSetScore[] = []
    for (let i = 0; i < count; i++) {
        const meWin = chance(0.55)
        const l = randInt(5)
        sets.push(meWin ? { me: 6, opp: l } : { me: l, opp: 6 })
    }
    return sets
}

const EXT_NAMES = ['김철수', '박영희', '이준호', '최수민', '정대현', '강은지', '윤서준', '한지우']
const handPick = (): 'right' | 'left' => (chance(0.8) ? 'right' : 'left')

async function createPersonalMatches(sb: SupabaseClient, members: Member[]): Promise<number> {
    let total = 0
    for (const u of members) {
        const n = randInt(6) // 0~5
        const rows: Array<Record<string, unknown>> = []
        for (let i = 0; i < n; i++) {
            const matchType = weightedPick<MatchType>([
                ['singles', 5],
                ['men_doubles', 2],
                ['women_doubles', 1],
                ['mixed_doubles', 2],
            ])
            const setScores = makePersonalSets()
            const isDoubles = matchType !== 'singles'

            // 상대(클럽 회원 50% / 외부 50%)
            const useMember = chance(0.5)
            const others = members.filter((m) => m.id !== u.id)
            const opp = useMember && others.length ? pick(others) : null
            const opponentName = opp ? opp.nickname : pick(EXT_NAMES)
            const opponentHand = opp ? opp.hand : handPick()

            const row: Record<string, unknown> = {
                user_id: u.id,
                match_type: matchType,
                played_at: randomRecentDate(),
                surface: surfacePick(),
                set_scores: setScores,
                winner: resolveMatchWinner(setScores),
                notes: SEED_TAG,
                opponent_name: opponentName,
                opponent_user_id: opp?.id ?? null,
                opponent_dominant_hand: opponentHand,
            }
            if (isDoubles) {
                const partner = others.length ? pick(others) : null
                const opp2 = pick(EXT_NAMES)
                row.partner_name = partner ? partner.nickname : pick(EXT_NAMES)
                row.partner_user_id = partner?.id ?? null
                row.partner_dominant_hand = partner ? partner.hand : handPick()
                row.opponent2_name = opp2
                row.opponent2_user_id = null
                row.opponent2_dominant_hand = handPick()
            }
            rows.push(row)
        }
        if (rows.length) {
            const { error } = await sb.from('personal_matches').insert(rows)
            if (error) throw error
            total += rows.length
        }
    }
    return total
}

// ── 메인 ────────────────────────────────────────────────
async function main() {
    const sb = createAdminClient()
    console.log('▶ 데이터 로드 중...')

    const [{ data: clubRows, error: e1 }, { data: memberRows, error: e2 }, { data: userRows, error: e3 }] =
        await Promise.all([
            sb.from('clubs').select('id, name'),
            sb.from('club_members').select('club_id, user_id').eq('status', 'approved'),
            sb.from('users').select('id, nickname, gender, ntrp, dominant_hand, is_guest'),
        ])
    if (e1 || e2 || e3) throw e1 ?? e2 ?? e3

    const userMap = new Map<string, Member>()
    for (const u of userRows ?? []) {
        if (u.gender !== 'male' && u.gender !== 'female') continue // 성별 없는 계정 제외
        userMap.set(u.id, {
            id: u.id,
            nickname: u.nickname ?? '회원',
            gender: u.gender,
            ntrp: u.ntrp != null ? Number(u.ntrp) : 3.0,
            hand: u.dominant_hand === 'left' ? 'left' : 'right',
        })
    }

    // 클럽별 풀 구성
    const pools = new Map<string, ClubPool>()
    for (const c of clubRows ?? []) {
        pools.set(c.id, {
            id: c.id,
            name: c.name,
            short: c.name.split(' ')[0],
            males: [],
            females: [],
            size: 0,
        })
    }
    for (const m of memberRows ?? []) {
        const pool = pools.get(m.club_id)
        const member = userMap.get(m.user_id)
        if (!pool || !member) continue
        if (member.gender === 'male') pool.males.push(member)
        else pool.females.push(member)
        pool.size++
    }

    const eligible = [...pools.values()].filter((p) => p.size >= MIN_MEMBERS_FOR_CLUB)
    if (eligible.length === 0) throw new Error('복식 가능한 클럽이 없습니다.')
    console.log(
        `  대상 클럽 ${eligible.length}개: ${eligible.map((p) => `${p.short}(${p.size})`).join(', ')}`,
    )

    // 멤버 수 비례로 100개 분배(잔여는 랜덤 가산)
    const totalWeight = eligible.reduce((s, p) => s + p.size, 0)
    const assign = eligible.map((p) => ({
        pool: p,
        count: Math.floor((TOTAL_MATCH_GAMES * p.size) / totalWeight),
    }))
    let rem = TOTAL_MATCH_GAMES - assign.reduce((s, a) => s + a.count, 0)
    while (rem-- > 0) assign[randInt(assign.length)].count++

    // 대진표 생성
    console.log('▶ 대진표 생성 중...')
    let gameCount = 0
    let matchCount = 0
    for (const a of assign) {
        for (let i = 0; i < a.count; i++) {
            matchCount += await createMatchGame(sb, a.pool)
            gameCount++
        }
        console.log(`  ${a.pool.short}: 대진표 ${a.count}개`)
    }
    console.log(`  → 대진표 ${gameCount}개 / 경기 ${matchCount}건 생성`)

    // 개인경기
    console.log('▶ 개인경기 생성 중...')
    const realMembers = [...userMap.values()].filter((m) => {
        const raw = (userRows ?? []).find((u) => u.id === m.id)
        return raw && !raw.is_guest
    })
    const pmCount = await createPersonalMatches(sb, realMembers)
    console.log(`  → 개인경기 ${pmCount}건 생성`)

    // 레이팅 재계산
    console.log('▶ 클럽 레이팅 재계산 중...')
    for (const a of assign) {
        await recalcClubRatings(sb, a.pool.id)
        console.log(`  ${a.pool.short} 재계산 완료`)
    }

    console.log('\n✓ 시드 완료')
}

main().catch((err) => {
    console.error('✗ 시드 실패:', err)
    process.exit(1)
})
