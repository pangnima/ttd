/**
 * pangnima(본인) 화면 검증용 보강 시드.
 *   1) pangnima 를 강남 테니스 클럽에 approved 멤버로 가입
 *   2) pangnima 중심 클럽 경기 50건 생성 (10개 대진표)
 *      - 특정 라이벌과 단식 집중 → 강한/약한 상대 카드
 *      - 파트너 반복 → 파트너 카드 / 표면·듀스·애드 다양
 *   3) pangnima 개인경기 12건 + 전체 회원 개인경기 보강(손잡이 카드)
 *   4) 강남 클럽 레이팅 재계산
 *
 * 식별 태그 [시드] 사용(롤백: clear-seed-data.ts).
 * 실행: npx tsx scripts/seed-pangnima.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    createAdminClient,
    recalcClubRatings,
    SEED_TAG,
    randInt,
    pick,
    chance,
    shuffle,
    weightedPick,
    randomRecentDate,
} from './_seed-shared'
import { resolveMatchWinner } from '../src/lib/personal-matches/winner'
import type { CourtSurface, MatchType, PersonalMatchSetScore } from '../src/types'

const PANGNIMA_ID = 'b8566909-dbca-4289-b491-9d1c8af7b805'
const GANGNAM_ID = '172f58b2-9a5c-4eb6-8199-8e8fa08a7cd3'

type Member = {
    id: string
    nickname: string
    gender: 'male' | 'female'
    ntrp: number
    hand: 'right' | 'left'
}
const PANGNIMA: Member = { id: PANGNIMA_ID, nickname: '쏘맥', gender: 'male', ntrp: 3.0, hand: 'right' }

type SetScore = { team1: number; team2: number }
type Result = { sets: SetScore[]; winnerId: 'team1' | 'team2' | 'draw' }

// ── 결과/표면 헬퍼 ──────────────────────────────────────
function makeSetScore(team1Wins: boolean): SetScore {
    let w = 6
    let l = randInt(5)
    if (chance(0.15)) {
        w = 7
        l = chance(0.5) ? 5 : 6
    }
    return team1Wins ? { team1: w, team2: l } : { team1: l, team2: w }
}
function genResult(team1Avg: number, team2Avg: number): Result {
    if (chance(0.03)) {
        const g = 4 + randInt(3)
        return { sets: [{ team1: g, team2: g }], winnerId: 'draw' }
    }
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
const teamAvg = (ms: Member[]): number => ms.reduce((s, m) => s + m.ntrp, 0) / ms.length
const handPick = (): 'right' | 'left' => (chance(0.7) ? 'right' : 'left')

const toMember = (u: {
    id: string
    nickname: string | null
    gender: string | null
    ntrp: number | string | null
    dominant_hand: string | null
}): Member => ({
    id: u.id,
    nickname: u.nickname ?? '회원',
    gender: u.gender === 'female' ? 'female' : 'male',
    ntrp: u.ntrp != null ? Number(u.ntrp) : 3.0,
    hand: u.dominant_hand === 'left' ? 'left' : 'right',
})

/** 풀에서 exclude 를 제외하고 n명을 무작위로 뽑는다(부족하면 가능한 만큼). */
function takeFrom(pool: Member[], exclude: Set<string>, n: number): Member[] {
    const avail = shuffle(pool.filter((m) => !exclude.has(m.id)))
    return avail.slice(0, n)
}

// ── pangnima 클럽 경기 50건 ─────────────────────────────
type Spec =
    | { kind: 'singles'; opp: Member }
    | { kind: 'men_doubles'; partner: Member }
    | { kind: 'mixed_doubles'; partner: Member }

function buildMatchPayload(
    spec: Spec,
    males: Member[],
    females: Member[],
): Record<string, unknown> {
    const adBase = { team1_ad_player_id: null as string | null, team2_ad_player_id: null as string | null }
    if (spec.kind === 'singles') {
        const r = genResult(PANGNIMA.ntrp, spec.opp.ntrp)
        return {
            match_type: 'singles',
            player1_id: PANGNIMA.id,
            player2_id: spec.opp.id,
            team1: null,
            team2: null,
            ...adBase,
            status: 'finished',
            result_sets: r.sets,
            winner_id: r.winnerId,
        }
    }
    const exclude = new Set<string>([PANGNIMA.id, spec.partner.id])
    let team2: Member[]
    if (spec.kind === 'men_doubles') {
        team2 = takeFrom(males, exclude, 2)
    } else {
        const oppM = takeFrom(males, exclude, 1)
        const oppF = takeFrom(females, exclude, 1)
        team2 = [...oppM, ...oppF]
    }
    const team1 = [PANGNIMA, spec.partner]
    const r = genResult(teamAvg(team1), teamAvg(team2))
    const ad = chance(0.7)
    return {
        match_type: spec.kind,
        player1_id: null,
        player2_id: null,
        team1: team1.map((m) => m.id),
        team2: team2.map((m) => m.id),
        team1_ad_player_id: ad ? pick(team1).id : null,
        team2_ad_player_id: ad ? pick(team2).id : null,
        status: 'finished',
        result_sets: r.sets,
        winner_id: r.winnerId,
    }
}

async function createPangnimaGames(sb: SupabaseClient, males: Member[], females: Member[]) {
    const eligibleM = males.filter((m) => m.ntrp != null) // 게스트(ntrp 없음) 제외된 풀
    eligibleM.sort((a, b) => a.ntrp - b.ntrp)
    // pangnima(3.0) 입장 강한 상대 = 낮은 NTRP(자주 이김), 약한 상대 = 높은 NTRP(자주 짐)
    const strongRival = eligibleM[0]
    const weakRival = eligibleM[eligibleM.length - 1]
    const midRival = eligibleM[Math.floor(eligibleM.length / 2)]
    const malePartners = eligibleM.slice(1, 3)
    const femalePartners = shuffle(females).slice(0, 2)

    // 50경기 스펙: 단식 26(강12/약10/중4) + 남복 12 + 혼복 12
    const specs: Spec[] = []
    for (let i = 0; i < 12; i++) specs.push({ kind: 'singles', opp: strongRival })
    for (let i = 0; i < 10; i++) specs.push({ kind: 'singles', opp: weakRival })
    for (let i = 0; i < 4; i++) specs.push({ kind: 'singles', opp: midRival })
    for (let i = 0; i < 12; i++) specs.push({ kind: 'men_doubles', partner: pick(malePartners) })
    for (let i = 0; i < 12; i++) specs.push({ kind: 'mixed_doubles', partner: pick(femalePartners) })
    const shuffled = shuffle(specs)

    // 10개 대진표 × 5경기. 표면 분산(hard6/clay3/grass1)
    const surfaces = shuffle<CourtSurface>([
        'hard', 'hard', 'hard', 'hard', 'hard', 'hard', 'clay', 'clay', 'clay', 'grass',
    ])
    let made = 0
    for (let g = 0; g < 10; g++) {
        const date = randomRecentDate()
        const { data: mg, error: mgErr } = await sb
            .from('match_games')
            .insert({ club_id: GANGNAM_ID, name: `${SEED_TAG} 쏘맥 ${date} 개인전`, date, is_fixed: true })
            .select('id')
            .single()
        if (mgErr || !mg) throw mgErr ?? new Error('match_game insert 실패')
        const mgId = mg.id as string

        const { data: court, error: cErr } = await sb
            .from('match_game_courts')
            .insert({ match_game_id: mgId, label: '1코트', order: 1, surface: surfaces[g] })
            .select('id')
            .single()
        if (cErr || !court) throw cErr ?? new Error('court insert 실패')

        const groupSpecs = shuffled.slice(g * 5, g * 5 + 5)
        const matchesPayload: Array<Record<string, unknown>> = []
        for (let r = 0; r < groupSpecs.length; r++) {
            const { data: round, error: rErr } = await sb
                .from('match_game_rounds')
                .insert({ match_game_id: mgId, label: `${r + 1}회전`, order: r + 1 })
                .select('id')
                .single()
            if (rErr || !round) throw rErr ?? new Error('round insert 실패')
            const hh = String(9 + r).padStart(2, '0')
            const { data: slot, error: sErr } = await sb
                .from('match_game_time_slots')
                .insert({ round_id: round.id, start_at: `${hh}:00`, end_at: `${hh}:30` })
                .select('id')
                .single()
            if (sErr || !slot) throw sErr ?? new Error('slot insert 실패')
            matchesPayload.push({
                match_game_id: mgId,
                round_id: round.id,
                court_id: court.id,
                time_slot_id: slot.id,
                order: r + 1,
                ...buildMatchPayload(groupSpecs[r], males, females),
            })
        }
        const { error: mErr } = await sb.from('match_game_matches').insert(matchesPayload)
        if (mErr) throw mErr
        made += matchesPayload.length
    }
    return made
}

// ── 개인경기 ────────────────────────────────────────────
const EXT_NAMES = ['김철수', '박영희', '이준호', '최수민', '정대현', '강은지', '윤서준', '한지우']
const surfacePick = (): CourtSurface =>
    weightedPick<CourtSurface>([
        ['hard', 55],
        ['clay', 25],
        ['grass', 12],
        ['other', 8],
    ])
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
async function addPersonalMatches(sb: SupabaseClient, me: Member, others: Member[], count: number) {
    const rows: Array<Record<string, unknown>> = []
    for (let i = 0; i < count; i++) {
        const matchType = weightedPick<MatchType>([
            ['singles', 5],
            ['men_doubles', 2],
            ['women_doubles', 1],
            ['mixed_doubles', 2],
        ])
        const setScores = makePersonalSets()
        const useMember = chance(0.5)
        const opp = useMember && others.length ? pick(others) : null
        const row: Record<string, unknown> = {
            user_id: me.id,
            match_type: matchType,
            played_at: randomRecentDate(),
            surface: surfacePick(),
            set_scores: setScores,
            winner: resolveMatchWinner(setScores),
            notes: SEED_TAG,
            opponent_name: opp ? opp.nickname : pick(EXT_NAMES),
            opponent_user_id: opp?.id ?? null,
            opponent_dominant_hand: opp ? opp.hand : handPick(),
        }
        if (matchType !== 'singles') {
            const partner = others.length ? pick(others) : null
            row.partner_name = partner ? partner.nickname : pick(EXT_NAMES)
            row.partner_user_id = partner?.id ?? null
            row.partner_dominant_hand = partner ? partner.hand : handPick()
            row.opponent2_name = pick(EXT_NAMES)
            row.opponent2_user_id = null
            row.opponent2_dominant_hand = handPick()
        }
        rows.push(row)
    }
    if (rows.length) {
        const { error } = await sb.from('personal_matches').insert(rows)
        if (error) throw error
    }
    return rows.length
}

// ── 메인 ────────────────────────────────────────────────
async function main() {
    const sb = createAdminClient()

    // 1) 강남 가입
    console.log('▶ pangnima 강남 클럽 가입...')
    const up = await sb
        .from('club_members')
        .upsert(
            { club_id: GANGNAM_ID, user_id: PANGNIMA_ID, role: 'member', status: 'approved' },
            { onConflict: 'club_id,user_id' },
        )
    if (up.error) throw up.error

    // 2) 강남 멤버 풀
    const { data: memberRows, error: e1 } = await sb
        .from('club_members')
        .select('user_id')
        .eq('club_id', GANGNAM_ID)
        .eq('status', 'approved')
    if (e1) throw e1
    const memberIds = (memberRows ?? []).map((r) => r.user_id as string).filter((id) => id !== PANGNIMA_ID)
    const { data: gnUsers, error: e2 } = await sb
        .from('users')
        .select('id, nickname, gender, ntrp, dominant_hand')
        .in('id', memberIds)
    if (e2) throw e2
    const gnMembers = (gnUsers ?? []).filter((u) => u.ntrp != null).map(toMember) // 게스트(ntrp null) 제외
    const males = gnMembers.filter((m) => m.gender === 'male')
    const females = gnMembers.filter((m) => m.gender === 'female')
    console.log(`  강남 상대 풀: 남 ${males.length} / 여 ${females.length}`)

    // 3) pangnima 클럽 경기 50건
    console.log('▶ pangnima 클럽 경기 생성...')
    const gameCount = await createPangnimaGames(sb, males, females)
    console.log(`  → ${gameCount}건 생성`)

    // 4) 개인경기 보강(전체 회원 + pangnima)
    console.log('▶ 개인경기 보강...')
    const { data: allUsers, error: e3 } = await sb
        .from('users')
        .select('id, nickname, gender, ntrp, dominant_hand, is_guest')
    if (e3) throw e3
    const realMembers = (allUsers ?? [])
        .filter((u) => !u.is_guest && (u.gender === 'male' || u.gender === 'female'))
        .map(toMember)
    let pmTotal = 0
    for (const m of realMembers) {
        const others = realMembers.filter((x) => x.id !== m.id)
        const count = m.id === PANGNIMA_ID ? 12 : 4 + randInt(3) // pangnima 12, 나머지 4~6
        pmTotal += await addPersonalMatches(sb, m, others, count)
    }
    console.log(`  → 개인경기 ${pmTotal}건 보강`)

    // 5) member_count 보정 + 강남 레이팅 재계산
    const { count: approvedCount } = await sb
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', GANGNAM_ID)
        .eq('status', 'approved')
    if (approvedCount != null) {
        await sb.from('clubs').update({ member_count: approvedCount }).eq('id', GANGNAM_ID)
    }
    console.log('▶ 강남 레이팅 재계산...')
    await recalcClubRatings(sb, GANGNAM_ID)

    console.log('\n✓ pangnima 보강 시드 완료')
}

main().catch((err) => {
    console.error('✗ 실패:', err)
    process.exit(1)
})
