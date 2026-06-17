import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

// Pretendard 가변폰트 자체 호스팅 (Google Fonts 미제공 → next/font/local)
const pretendard = localFont({
    src: './fonts/PretendardVariable.woff2',
    variable: '--font-pretendard',
    display: 'swap',
    weight: '45 920', // 가변 axis 범위
})

export const metadata: Metadata = {
    // 배포 도메인. NEXT_PUBLIC_SITE_URL 미설정/빈 값이면 기본 도메인으로 폴백.
    // (|| 사용: .env.local에 빈 문자열로 존재해도 안전하게 폴백)
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ttd-kohl.vercel.app'),
    title: {
        default: 'BASELINE — 테니스 클럽 운영·경기 통계',
        template: '%s · BASELINE',
    },
    description: '테니스 클럽 운영자와 회원을 위한 클럽 관리 + 경기 통계 플랫폼',
    openGraph: {
        // images는 src/app/opengraph-image.tsx(파일 컨벤션)가 자동 주입한다.
        siteName: 'BASELINE',
        title: 'BASELINE — 테니스 클럽 운영·경기 통계',
        description: '테니스 클럽 운영자와 회원을 위한 클럽 관리 + 경기 통계 플랫폼',
        url: '/',
        locale: 'ko_KR',
        type: 'website',
    },
    twitter: {
        // twitter:image는 og:image로 폴백된다. 카카오/슬랙/페북은 og:image 사용.
        card: 'summary_large_image',
        title: 'BASELINE — 테니스 클럽 운영·경기 통계',
        description: '테니스 클럽 운영자와 회원을 위한 클럽 관리 + 경기 통계 플랫폼',
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    // 노치/홈 인디케이터 영역까지 활용 + safe-area-inset env() 값 활성화
    viewportFit: 'cover',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="ko"
            suppressHydrationWarning
            className={`${pretendard.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full bg-background">
                <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    )
}
