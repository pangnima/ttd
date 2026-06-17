import { ImageResponse } from 'next/og'
import { OG, loadOgFont } from '@/lib/og/brand'

// 사이트 전역 기본 OG 이미지 (파일 컨벤션 — 모든 라우트에 자동 적용, 하위에서 재정의 가능).
export const alt = 'BASELINE — 테니스 클럽 운영·경기 통계'
export const size = OG.size
export const contentType = 'image/png'

export default async function OpengraphImage() {
    const font = await loadOgFont()

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    background: OG.paper,
                    color: OG.ink,
                    padding: '96px',
                    fontFamily: 'Pretendard',
                }}
            >
                {/* 라임 포인트 라벨 */}
                <div
                    style={{
                        display: 'flex',
                        alignSelf: 'flex-start',
                        background: OG.lime,
                        color: OG.ink,
                        fontSize: 30,
                        letterSpacing: 4,
                        padding: '10px 22px',
                        borderRadius: 9999,
                    }}
                >
                    TENNIS CLUB OS
                </div>

                {/* 워드마크 */}
                <div style={{ display: 'flex', marginTop: 40, fontSize: 150, letterSpacing: -4 }}>
                    BASELINE
                </div>

                {/* 태그라인 */}
                <div style={{ display: 'flex', marginTop: 24, fontSize: 46, color: OG.muted }}>
                    코트 위 모든 경기를 기록하고 분석하다
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [{ name: 'Pretendard', data: font, style: 'normal', weight: 600 }],
        }
    )
}
