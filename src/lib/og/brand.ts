// OG 이미지(next/og ImageResponse) 공용 상수·폰트 로더.
// Satori는 가변·woff2 폰트를 못 쓰므로 정적 OTF(Pretendard SemiBold)를 번들해 사용한다.
// 빌드/런타임 모두에서 fs로 읽는다(Turbopack은 file:// fetch 미지원). 배포 번들 포함은
// next.config.ts의 outputFileTracingIncludes로 보장.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// 브랜드 색 — globals.css `:root`(라이트) 토큰의 수동 미러.
// Satori는 CSS 변수를 해석하지 못해 값을 복제해야 한다. 드리프트는
// src/lib/dashboard/colors.test.ts가 globals.css와 대조해 잡는다 (docs/color-system.md §6).
export const OG = {
    size: { width: 1200, height: 630 },
    background: '#f4f7f9',      // --background
    foreground: '#1d2d35',      // --foreground
    spot: '#ffd166',            // --spot-solid
    mutedForeground: '#5e7383', // --muted-foreground
    card: '#ffffff',            // --card
    border: '#d3dde4',          // --border
} as const

let cachedFont: Buffer | null = null

/** OG 이미지용 정적 한글 폰트(Pretendard SemiBold) 1회 로드 후 캐시. */
export async function loadOgFont(): Promise<Buffer> {
    if (cachedFont) return cachedFont
    cachedFont = await readFile(join(process.cwd(), 'src/lib/og/Pretendard-SemiBold.otf'))
    return cachedFont
}
