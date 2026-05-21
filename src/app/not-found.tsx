import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
            <p className="text-6xl font-bold text-muted-foreground">404</p>
            <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
            <p className="text-muted-foreground">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
            <Link
                href="/dashboard"
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
                대시보드로 돌아가기
            </Link>
        </div>
    )
}
