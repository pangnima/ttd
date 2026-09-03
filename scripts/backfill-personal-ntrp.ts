/**
 * 기존 데이터 백필: 모든 유저의 personal_ntrp(개인경기 기반 동적 NTRP 캐시)를 일괄 재계산한다.
 * service-role 키로 RLS를 우회해 전 유저의 personal_matches를 읽어, 앱과 동일한 엔진
 * (explodePersonalMatchSets → replayPersonalRatings)으로 산출한다.
 *
 * 실행: npm run db:backfill-personal-ntrp
 * 필요 env(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/supabase'
import { mapPersonalMatchRow } from '../src/lib/personal-matches/map'
import { explodePersonalMatchSets } from '../src/lib/personal-matches/explode'
import { replayPersonalRatings } from '../src/lib/rating/personal-rating'

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
        process.exit(1)
    }
    const supabase = createClient<Database>(url, key)

    // 전 유저 ntrp (시드 + 상대 NTRP resolver)
    const { data: users, error: uErr } = await supabase.from('users').select('id, ntrp')
    if (uErr || !users) {
        console.error('users 조회 실패:', uErr?.message)
        process.exit(1)
    }
    const ntrpById = new Map<string, number>()
    for (const u of users) {
        if (u.ntrp != null && Number(u.ntrp) > 0) ntrpById.set(u.id, Number(u.ntrp))
    }

    // 전 개인경기 (service-role → RLS 우회). 참가자(opponent/partner/opponent2)는 별도 정규화 테이블에서 조인.
    const { data: rows, error: pErr } = await supabase
        .from('personal_matches')
        .select('*, participants:personal_match_participants(*)')
    if (pErr || !rows) {
        console.error('personal_matches 조회 실패:', pErr?.message)
        process.exit(1)
    }
    const byUser = new Map<string, typeof rows>()
    for (const r of rows) {
        const arr = byUser.get(r.user_id) ?? []
        arr.push(r)
        byUser.set(r.user_id, arr)
    }

    let updated = 0
    for (const u of users) {
        const userRows = byUser.get(u.id)
        if (!userRows || userRows.length === 0) continue // 경기 없는 유저는 null 유지

        const matches = userRows.map((row) => mapPersonalMatchRow(row, row.participants))
        const games = explodePersonalMatchSets(matches)
        const selfNtrp = u.ntrp != null && Number(u.ntrp) > 0 ? Number(u.ntrp) : null
        const snap = replayPersonalRatings(games, selfNtrp, (id) => ntrpById.get(id))
        const personalNtrp = snap.matchesPlayed > 0 ? snap.rating : null

        const { error } = await supabase.from('users').update({ personal_ntrp: personalNtrp }).eq('id', u.id)
        if (error) console.error(`update 실패 (${u.id}):`, error.message)
        else if (personalNtrp != null) updated++
    }

    console.log(`백필 완료: personal_ntrp 갱신 ${updated}명 / 전체 ${users.length}명`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
