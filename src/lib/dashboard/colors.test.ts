import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { OG } from '@/lib/og/brand'

/**
 * 컬러 시스템 회귀 가드 (docs/color-system.md).
 * 1) globals.css 밖에 하드코딩된 색상이 없는지
 * 2) 라이트/다크 토큰이 WCAG 대비를 만족하는지
 * 3) OG 이미지의 수동 미러 값이 라이트 토큰과 어긋나지 않았는지
 */

const SRC = path.resolve(__dirname, '../..')
const GLOBALS = path.join(SRC, 'app/globals.css')

// ── 파일 수집 ────────────────────────────────────────────────────────
/** 팔레트 교체 대상에서 제외되는 경로 — 이유는 docs/color-system.md §6 */
const ALLOWLIST = [
    'components/ui', // shadcn 자동 생성, 수정 금지
    'lib/rating/tier.ts', // 티어 8계급 = 게임 랭크 정체성, 브랜드 팔레트와 분리
    'lib/og/brand.ts', // Satori는 CSS 변수 미지원 — 아래에서 값 일치를 따로 검증
    'app/layout.tsx', // viewport.themeColor(브라우저 크롬)는 CSS 변수 미지원 — 〃
]

function collectSources(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(SRC, full).split(path.sep).join('/')
        if (ALLOWLIST.some((p) => rel === p || rel.startsWith(`${p}/`))) continue
        if (entry.isDirectory()) collectSources(full, acc)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full)
    }
    return acc
}

const SOURCES = collectSources(SRC)

const TAILWIND_HUES =
    'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITY_PREFIX =
    'bg|text|border|ring|fill|stroke|from|to|via|divide|outline|placeholder|decoration|shadow|accent|caret'
const BANNED_PALETTE = new RegExp(`\\b(?:${UTILITY_PREFIX})-(?:${TAILWIND_HUES})-(?:50|[1-9]00|[1-9]50)\\b`)
const BANNED_ARBITRARY = new RegExp(`\\b(?:${UTILITY_PREFIX})-\\[#`)
const BANNED_HEX = /['"`]#[0-9a-fA-F]{3,8}['"`]/

describe('색상 하드코딩 금지', () => {
    it('Tailwind 기본 팔레트 클래스를 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_PALETTE.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })

    it('임의값 색상(bg-[#...])을 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_ARBITRARY.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })

    it('hex 색상 리터럴을 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_HEX.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })
})

// ── globals.css 토큰 파싱 + 대비 계산 ────────────────────────────────
// 주석에 중괄호가 섞이면 블록 파싱이 끊기므로 먼저 제거한다.
const CSS = readFileSync(GLOBALS, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `:root {...}`(L2 시맨틱 블록) / `.dark {...}` 안의 `--토큰: 값;`을 모은다. */
function readTokens(selector: string): Record<string, string> {
    const out: Record<string, string> = {}
    const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g')
    for (const block of CSS.matchAll(re)) {
        for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
            out[name] = value.trim()
        }
    }
    return out
}

const LIGHT = readTokens(':root')
const DARK = { ...LIGHT, ...readTokens('\\.dark') }

/** `var(--x)` 참조를 끝까지 따라가 hex로 해석한다. */
function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
    const raw = tokens[name]
    if (raw === undefined) throw new Error(`토큰 --${name}이 globals.css에 없습니다`)
    const ref = /^var\(--([\w-]+)\)$/.exec(raw)
    if (ref) {
        if (depth > 5) throw new Error(`--${name} 참조가 순환합니다`)
        return resolve(tokens, ref[1], depth + 1)
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(raw)) throw new Error(`--${name}이 6자리 hex가 아닙니다: ${raw}`)
    return raw.toLowerCase()
}

function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16)
    const channel = (c: number) => {
        const s = c / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

/** [전경, 배경, 최소 대비] — 배경은 카드·배경 중 불리한 쪽까지 함께 본다. */
const TEXT_ON_SURFACE: [string, number][] = [
    ['foreground', 7], // 본문 (AAA)
    ['muted-foreground', 4.5], // 보조 텍스트 (AA)
    ['primary', 4.5], // 링크·액션 텍스트
    ['info', 4.5],
    ['win', 4.5],
    ['loss', 4.5],
    ['spot', 4.5],
    ['destructive', 4.5],
    ...Array.from({ length: 8 }, (_, i): [string, number] => [`cat-${i + 1}`, 4.5]),
]

/**
 * 채움 위에 글자를 얹는 실제 조합 — `bg-X text-X-foreground`.
 * 비비드 `--X-solid`는 글자를 얹지 않는 바·링 전용이라 여기에 없다(docs/color-system.md §2).
 */
const SOLID_PAIRS: [string, string][] = [
    ['primary-foreground', 'primary'],
    ['win-foreground', 'win'],
    ['loss-foreground', 'loss'],
    ['info-foreground', 'info'],
    ['destructive-foreground', 'destructive'],
    ['spot-foreground', 'spot-solid'], // Chip solid / Badge lime / Button accent
]

describe.each([
    ['라이트', LIGHT],
    ['다크', DARK],
])('%s 모드 WCAG 대비', (_mode, tokens) => {
    it.each(TEXT_ON_SURFACE)('--%s는 카드·배경 위에서 %s:1 이상이다', (name, min) => {
        const fg = resolve(tokens, name)
        for (const surface of ['card', 'background'] as const) {
            expect(contrast(fg, resolve(tokens, surface))).toBeGreaterThanOrEqual(min)
        }
    })

    it.each(SOLID_PAIRS)('--%s는 --%s 위에서 4.5:1 이상이다', (fg, bg) => {
        expect(contrast(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(4.5)
    })

    it('입력 경계(--input)는 카드 대비 3:1 이상이다 (WCAG 1.4.11)', () => {
        expect(contrast(resolve(tokens, 'input'), resolve(tokens, 'card'))).toBeGreaterThanOrEqual(3)
    })

    it('카테고리 팔레트가 승패 시맨틱과 눈에 띄게 다른 색이다', () => {
        // "분류 태그는 결과 색을 빌려 쓰지 않는다"는 규칙을 값으로 고정한다 (docs/color-system.md §3).
        // primary와는 겹칠 수 있다 — cat-1(단식·하드코트)은 브랜드 블루에 앵커한 의도된 공유다(§4).
        const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
        const distance = (a: string, b: string) => {
            const [x, y] = [rgb(a), rgb(b)]
            return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
        }
        for (let i = 1; i <= 8; i++) {
            const cat = resolve(tokens, `cat-${i}`)
            for (const semantic of ['win', 'loss'] as const) {
                expect(distance(cat, resolve(tokens, semantic)), `cat-${i} vs ${semantic}`).toBeGreaterThan(30)
            }
        }
    })

    it('surface 3단(background·secondary·card)이 서로 구분된다', () => {
        // 랜딩·카드 레이아웃이 이 계단에 의존한다. 값이 겹치면 영역 경계가 사라진다.
        const levels = (['background', 'secondary', 'card'] as const).map((n) => resolve(tokens, n))
        expect(new Set(levels).size).toBe(3)
        for (const [a, b] of [
            [levels[0], levels[1]],
            [levels[1], levels[2]],
        ]) {
            expect(Math.abs(luminance(a) - luminance(b))).toBeGreaterThan(0.008)
        }
    })
})

describe('브라우저 크롬 색 미러 값 (viewport.themeColor는 CSS 변수 미지원)', () => {
    const LAYOUT = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf-8')
    const declared = [...LAYOUT.matchAll(/prefers-color-scheme:\s*(light|dark)\)',\s*color:\s*'(#[0-9a-f]{6})'/g)]

    it('라이트·다크 두 항목을 모두 선언한다', () => {
        expect(declared.map(([, scheme]) => scheme)).toEqual(['light', 'dark'])
    })

    it('각 값이 해당 모드의 --background와 같다', () => {
        expect(declared[0]?.[2]).toBe(resolve(LIGHT, 'background'))
        expect(declared[1]?.[2]).toBe(resolve(DARK, 'background'))
    })
})

describe('OG 이미지 미러 값 (Satori는 CSS 변수 미지원)', () => {
    it.each([
        ['background', 'background'],
        ['foreground', 'foreground'],
        ['spot', 'spot-solid'],
        ['mutedForeground', 'muted-foreground'],
        ['card', 'card'],
        ['border', 'border'],
    ] as const)('OG.%s는 라이트 토큰 --%s와 같다', (ogKey, token) => {
        expect(OG[ogKey]).toBe(resolve(LIGHT, token))
    })
})
