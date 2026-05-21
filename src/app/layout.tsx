import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Sans_KR } from 'next/font/google'
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

const notoSansKR = Noto_Sans_KR({
    variable: '--font-noto-kr',
    subsets: ['latin'],
    weight: ['400', '500', '700', '900'],
})

export const metadata: Metadata = {
    metadataBase: new URL('https://tennis-club.vercel.app'),
    title: {
        default: '테니스 클럽 플랫폼',
        template: '%s | 테니스 클럽',
    },
    description: '테니스 클럽 운영자와 회원을 위한 클럽 관리 + 경기 통계 플랫폼',
    openGraph: {
        title: '테니스 클럽 플랫폼',
        description: '테니스 클럽 운영자와 회원을 위한 클럽 관리 + 경기 통계 플랫폼',
        locale: 'ko_KR',
        type: 'website',
    },
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
            className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} h-full antialiased`}
        >
            <body className="min-h-full bg-background">
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    )
}
