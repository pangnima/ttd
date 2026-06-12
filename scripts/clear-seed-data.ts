/**
 * 시드 데이터 롤백.
 *   - name 이 [시드]로 시작하는 대진표를 삭제(연쇄로 courts/rounds/slots/matches 제거)
 *   - notes 에 [시드] 가 포함된 개인경기 삭제
 *   - 영향받은 클럽 레이팅을 남은(기존) 확정 경기 기준으로 재계산해 baseline 복원
 *
 * 실행: npx tsx scripts/clear-seed-data.ts
 */
import { createAdminClient, recalcClubRatings, SEED_TAG } from './_seed-shared'

async function main() {
    const sb = createAdminClient()

    const { data: seeded, error } = await sb
        .from('match_games')
        .select('id, club_id')
        .like('name', `${SEED_TAG}%`)
    if (error) throw error

    const clubIds = [...new Set((seeded ?? []).map((g) => g.club_id as string))]
    console.log(`▶ 삭제 대상: 대진표 ${seeded?.length ?? 0}개, 영향 클럽 ${clubIds.length}개`)

    // 대진표 삭제(하위 코트/라운드/슬롯/매치는 FK ON DELETE CASCADE 로 함께 제거)
    const delMG = await sb.from('match_games').delete().like('name', `${SEED_TAG}%`)
    if (delMG.error) throw delMG.error

    // 시드 개인경기 삭제
    const delPM = await sb.from('personal_matches').delete().like('notes', `%${SEED_TAG}%`)
    if (delPM.error) throw delPM.error
    console.log('  대진표·개인경기 삭제 완료')

    // 영향 클럽 레이팅 재계산(남은 기존 확정 경기 기준)
    for (const clubId of clubIds) {
        await recalcClubRatings(sb, clubId)
    }
    console.log(`  레이팅 재계산 완료(${clubIds.length}개 클럽)`)

    console.log('\n✓ 롤백 완료')
}

main().catch((err) => {
    console.error('✗ 롤백 실패:', err)
    process.exit(1)
})
