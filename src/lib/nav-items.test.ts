import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_LABEL, buildPersonalNavItem, guideNavItem, myMatchNavItems } from './nav-items'

/**
 * 사이드 메뉴 라벨 회귀 가드(Week 67).
 *
 * 라벨은 `NAV_LABEL` 하나에서 나오고 페이지 제목·가이드·안내문이 그것을 보간한다. 그런데 그 문자열을
 * 다시 리터럴로 적어도 tsc는 모른다 — 그래서 옛 이름이 src에 되살아나지 않는지를 파일 스캔으로 굳힌다
 * (`colors.test.ts`의 수집 관용구). 주석은 벗기고 본다 — 이력 설명은 옛 이름을 말할 수 있어야 한다.
 */

const SRC = path.resolve(__dirname, '..')

/** 옛 라벨 — 메뉴명이었던 전체 문자열만. '개인 경기'는 클럽 경기와 대비되는 도메인 어휘라 잡지 않는다 */
const RETIRED_LABELS = ['개인 경기 결과']

function collectSources(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) collectSources(full, acc)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full)
    }
    return acc
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

describe('NAV_LABEL', () => {
    it('메뉴 항목이 전부 NAV_LABEL을 쓴다 — 라벨 출처는 하나다', () => {
        const labels = [buildPersonalNavItem('u').label, ...myMatchNavItems.map((n) => n.label), guideNavItem.label]
        expect(labels).toEqual([NAV_LABEL.myStats, NAV_LABEL.matchRooms, NAV_LABEL.myRooms, NAV_LABEL.myRecords, NAV_LABEL.guide])
    })

    it("옛 메뉴명이 노출 문구로 되살아나지 않는다 — '개인 경기 결과'는 '내 경기 결과', '개인'은 '개인 통계'다", () => {
        const hits: string[] = []
        for (const file of collectSources(SRC)) {
            const code = stripComments(readFileSync(file, 'utf-8'))
            for (const w of RETIRED_LABELS) if (code.includes(w)) hits.push(`${path.relative(SRC, file)}: ${w}`)
            if (/label:\s*'개인'/.test(code) && !file.endsWith('profile-scope-tabs.tsx')) hits.push(`${path.relative(SRC, file)}: label '개인'`)
        }
        expect(hits).toEqual([])
    })
})
