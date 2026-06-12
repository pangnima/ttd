/**
 * 최근 날짜(2026-06-11 / 06-12) 개인경기 보강.
 *   - 최근 폼·최근 경기 카드에 어제/오늘 기록이 보이도록 명시적 날짜로 생성
 *   - pangnima 는 두 날짜 각각 다수 생성, 나머지 회원은 일부만
 *
 * 식별 태그 [시드] 사용(롤백: clear-seed-data.ts).
 * 실행: npx tsx scripts/seed-recent-personal.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, SEED_TAG, randInt, pick, chance, weightedPick } from './_seed-shared'
import { resolveMatchWinner } from '../src/lib/personal-matches/winner'
import type { CourtSurface, MatchType, PersonalMatchSetScore } from '../src/types'

const PANGNIMA_ID = 'b8566909-dbca-4289-b491-9d1c8af7b805'
const DATES = ['2026-06-11', '2026-06-12']

type Member = { id: string; nickname: string; hand: 'right' | 'left' }
const EXT_NAMES = ['김철수', '박영희', '이준호', '최수민', '정대현', '강은지', '윤서준', '한지우']
const handPick = (): 'right' | 'left' => (chance(0.7) ? 'right' : 'left')
const surfacePick = (): CourtSurface =>
    weightedPick<CourtSurface>([
        ['hard', 55],
        ['clay', 25],
        ['grass', 12],
        ['other', 8],
    ])
function makeSets(): PersonalMatchSetScore[] {
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

function buildRow(me: Member, others: Member[], playedAt: string): Record<string, unknown> {
    const matchType = weightedPick<MatchType>([
        ['singles', 5],
        ['men_doubles', 2],
        ['women_doubles', 1],
        ['mixed_doubles', 2],
    ])
    const setScores = makeSets()
    const opp = chance(0.5) && others.length ? pick(others) : null
    const row: Record<string, unknown> = {
        user_id: me.id,
        match_type: matchType,
        played_at: playedAt,
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
    return row
}

async function main() {
    const sb: SupabaseClient = createAdminClient()

    const { data: users, error } = await sb
        .from('users')
        .select('id, nickname, dominant_hand, is_guest')
    if (error) throw error
    const members: Member[] = (users ?? [])
        .filter((u) => !u.is_guest)
        .map((u) => ({
            id: u.id,
            nickname: u.nickname ?? '회원',
            hand: u.dominant_hand === 'left' ? 'left' : 'right',
        }))

    const rows: Array<Record<string, unknown>> = []
    for (const date of DATES) {
        for (const m of members) {
            const others = members.filter((x) => x.id !== m.id)
            // pangnima는 날짜별 2건, 나머지는 약 40% 확률로 1건
            if (m.id === PANGNIMA_ID) {
                rows.push(buildRow(m, others, date), buildRow(m, others, date))
            } else if (chance(0.4)) {
                rows.push(buildRow(m, others, date))
            }
        }
    }

    const { error: insErr } = await sb.from('personal_matches').insert(rows)
    if (insErr) throw insErr
    console.log(`✓ 최근(06-11/06-12) 개인경기 ${rows.length}건 생성`)
}

main().catch((err) => {
    console.error('✗ 실패:', err)
    process.exit(1)
})
