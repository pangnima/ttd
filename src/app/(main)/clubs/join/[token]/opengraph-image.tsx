import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { OG, loadOgFont } from '@/lib/og/brand'

export const alt = '클럽 초대 — BASELINE'
export const size = OG.size
export const contentType = 'image/png'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ttd-kohl.vercel.app'

type ImageProps = { params: Promise<{ token: string }> }

export default async function InviteOgImage({ params }: ImageProps) {
    const { token } = await params
    const font = await loadOgFont()

    const supabase = await createClient()
    const { data } = await supabase.rpc('get_invite_preview', { p_token: token })
    const preview = data && data.length > 0 ? data[0] : null

    const name = preview?.name ?? '클럽 초대'
    const region = preview?.region ?? ''
    // 상대 경로 프리셋 로고는 절대 URL로 변환(Satori는 절대 URL만 fetch). 없으면 이니셜 표시.
    const rawLogo = preview?.logo_url ?? null
    const logoUrl = rawLogo
        ? rawLogo.startsWith('http')
            ? rawLogo
            : `${SITE}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`
        : null

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: OG.paper,
                    color: OG.ink,
                    padding: '88px',
                    fontFamily: 'Pretendard',
                }}
            >
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
                    클럽 초대
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            width={156}
                            height={156}
                            style={{ borderRadius: 28, objectFit: 'cover', border: `1px solid ${OG.border}` }}
                            alt=""
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 156,
                                height: 156,
                                borderRadius: 28,
                                background: OG.card,
                                border: `1px solid ${OG.border}`,
                                fontSize: 84,
                            }}
                        >
                            {name.slice(0, 1)}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', fontSize: 84, letterSpacing: -2 }}>{name}</div>
                        {region ? (
                            <div style={{ display: 'flex', marginTop: 12, fontSize: 38, color: OG.muted }}>
                                {region}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div style={{ display: 'flex', fontSize: 34, color: OG.muted }}>
                    가입하고 함께 경기를 기록해요 · BASELINE
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [{ name: 'Pretendard', data: font, style: 'normal', weight: 600 }],
        }
    )
}
