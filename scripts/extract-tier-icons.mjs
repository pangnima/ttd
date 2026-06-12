// 디자이너 전달 HTML(docs/tier/_ _ _ Dark.html)에서 8개 계급 엠블럼 SVG를 추출·정리해
// public/tiers/{tier}.svg 로 저장한다. 아이콘 교체 시 새 HTML로 이 스크립트를 재실행한다.
//
// 비대 원인: 디자인 툴이 모든 요소에 computed style 전체 + data-om-id 를 박아넣음.
// 처리: inline style 중 SVG 표현 속성만 화이트리스트로 복원 → attribute 전환,
//       style/data-* 전부 제거. 결과는 각 수 KB.
//
// 실행: node scripts/extract-tier-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'docs', 'tier', '_ _ _ Dark.html')
const OUT_DIR = join(ROOT, 'public', 'tiers')

// 문서 순서 = 계급 순서 (라벨 텍스트로 검증 완료).
const TIER_ORDER = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'challenger']

// inline style에서 복원할 SVG 표현 속성과 "기본값"(기본값이면 생략).
const STYLE_WHITELIST = {
    fill: ['rgb(0, 0, 0)', '#000', '#000000'],
    'fill-opacity': ['1'],
    'fill-rule': ['nonzero'],
    stroke: ['none'],
    'stroke-width': ['1px', '1'],
    'stroke-opacity': ['1'],
    'stroke-linecap': ['butt'],
    'stroke-linejoin': ['miter'],
    'stroke-dasharray': ['none'],
    'stroke-dashoffset': ['0px', '0'],
    opacity: ['1'],
    'clip-path': ['none'],
    'clip-rule': ['nonzero'],
    filter: ['none'],
    mask: ['none'],
    'mix-blend-mode': ['normal'],
    transform: ['none'],
    'stop-color': ['rgb(0, 0, 0)', '#000', '#000000'],
    'stop-opacity': ['1'],
}
const NUMERIC_PROPS = new Set(['stroke-width', 'stroke-dashoffset'])

function decode(v) {
    return v.replace(/&quot;/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
}

// style 문자열 → 복원할 [prop, value] 목록
function styleToAttrs(style, existingAttrs) {
    const out = []
    for (const decl of style.split(';')) {
        const i = decl.indexOf(':')
        if (i < 0) continue
        const k = decl.slice(0, i).trim()
        if (!(k in STYLE_WHITELIST)) continue
        if (k in existingAttrs) continue // 이미 속성으로 존재하면 우선
        let v = decode(decl.slice(i + 1).trim())
        if (!v || STYLE_WHITELIST[k].includes(v)) continue
        if (NUMERIC_PROPS.has(k)) v = v.replace(/px$/, '')
        out.push([k, v])
    }
    return out
}

function parseAttrs(inner) {
    const attrs = {}
    const re = /([:\w-]+)\s*=\s*"([^"]*)"/g
    let m
    while ((m = re.exec(inner))) attrs[m[1]] = m[2]
    return attrs
}

// 단일 태그 재작성: style 복원 + style/data-* 제거.
function rewriteTag(tag) {
    const self = /\/>$/.test(tag)
    const m = tag.match(/^<\s*([a-zA-Z][\w:-]*)([\s\S]*?)\/?>$/)
    if (!m) return tag
    const name = m[1]
    const inner = m[2]
    const attrs = parseAttrs(inner)

    const styleAttr = attrs.style ?? ''
    const restored = styleAttr ? styleToAttrs(styleAttr, attrs) : []

    // 제거: style, data-*
    delete attrs.style
    for (const k of Object.keys(attrs)) if (k.startsWith('data-')) delete attrs[k]

    if (name === 'svg') {
        // 루트: viewBox/xmlns만 유지, width/height 제거, role 추가.
        const keep = {}
        for (const k of Object.keys(attrs)) {
            if (k === 'viewBox' || k === 'xmlns' || k.startsWith('xmlns:')) keep[k] = attrs[k]
        }
        keep.role = 'img'
        return `<svg ${Object.entries(keep).map(([k, v]) => `${k}="${v}"`).join(' ')}>`
    }

    const merged = { ...attrs }
    for (const [k, v] of restored) merged[k] = v
    const attrStr = Object.entries(merged).map(([k, v]) => `${k}="${v}"`).join(' ')
    return `<${name}${attrStr ? ' ' + attrStr : ''}${self ? '/>' : '>'}`
}

function cleanSvg(svg) {
    // 모든 태그 재작성 (속성값에 '>' 없음 가정 — 디자인 툴 출력)
    let out = svg.replace(/<\/?[a-zA-Z][^>]*>/g, (tag) => (tag.startsWith('</') ? tag : rewriteTag(tag)))
    // 태그 사이 공백 정리
    out = out.replace(/>\s+</g, '><').trim()
    return out
}

function main() {
    const html = readFileSync(SRC, 'utf8')
    const blocks = []
    let i = 0
    while (true) {
        const a = html.indexOf('<svg', i)
        if (a < 0) break
        const b = html.indexOf('</svg>', a)
        blocks.push(html.slice(a, b + 6))
        i = b + 6
    }
    if (blocks.length !== TIER_ORDER.length) {
        throw new Error(`SVG ${blocks.length}개 발견 — 계급 ${TIER_ORDER.length}개와 불일치`)
    }

    mkdirSync(OUT_DIR, { recursive: true })
    blocks.forEach((raw, idx) => {
        const tier = TIER_ORDER[idx]
        const cleaned = cleanSvg(raw)
        const file = join(OUT_DIR, `${tier}.svg`)
        writeFileSync(file, cleaned, 'utf8')
        console.log(`  ${tier.padEnd(11)} ${(raw.length / 1024).toFixed(0)}KB → ${(cleaned.length / 1024).toFixed(1)}KB`)
    })
    console.log(`\n✓ ${blocks.length}개 아이콘 → public/tiers/`)
}

main()
