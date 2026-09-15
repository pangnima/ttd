/**
 * 가이드 문구의 강조 표기 — `**텍스트**`를 강조 조각으로 가른다(순수).
 *
 * 버튼·탭·상태 이름을 「」·[ ]로 감싸던 표기는 한 문장에 서너 번 겹치면 기호가 글을 덮었다.
 * 문구는 여전히 한 줄 문자열(단일 출처·vitest)이어야 하므로 마크업은 `**` 하나만 두고,
 * 그리는 쪽(`GuideText`)이 강조 조각을 글자 굵기·색으로 드러낸다.
 */
export type EmphasisPart = { text: string; strong: boolean }

export function splitEmphasis(text: string): EmphasisPart[] {
    const parts: EmphasisPart[] = []
    const re = /\*\*(.+?)\*\*/g
    let last = 0
    for (const m of text.matchAll(re)) {
        const start = m.index ?? 0
        if (start > last) parts.push({ text: text.slice(last, start), strong: false })
        parts.push({ text: m[1], strong: true })
        last = start + m[0].length
    }
    if (last < text.length) parts.push({ text: text.slice(last), strong: false })
    return parts
}

/** 마크업을 벗긴 평문 — 검색·테스트용 */
export function stripEmphasis(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '$1')
}
