// OG 이미지(next/og ImageResponse) 공용 상수·폰트 로더.
// Satori는 가변·woff2 폰트를 못 쓰므로 정적 OTF(Pretendard SemiBold)를 번들해 사용한다.
// 빌드/런타임 모두에서 fs로 읽는다(Turbopack은 file:// fetch 미지원). 배포 번들 포함은
// next.config.ts의 outputFileTracingIncludes로 보장.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// 브랜드 색 (globals.css 라이트 토큰과 동일 — 따뜻한 페이퍼 톤)
export const OG = {
    size: { width: 1200, height: 630 },
    paper: '#f3f2ec',
    ink: '#1a1a16',
    lime: '#c8f24e',
    muted: '#6e6e64',
    card: '#ffffff',
    border: '#e4e3d9',
} as const

let cachedFont: Buffer | null = null

/** OG 이미지용 정적 한글 폰트(Pretendard SemiBold) 1회 로드 후 캐시. */
export async function loadOgFont(): Promise<Buffer> {
    if (cachedFont) return cachedFont
    cachedFont = await readFile(join(process.cwd(), 'src/lib/og/Pretendard-SemiBold.otf'))
    return cachedFont
}
