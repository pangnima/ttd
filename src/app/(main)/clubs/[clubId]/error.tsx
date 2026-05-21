'use client'

import Link from 'next/link'

type Props = {
    error: Error & { digest?: string }
    reset: () => void
}

export function ClubError({ error, reset }: Props) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-4xl font-bold text-destructive">오류</p>
            <h1 className="text-lg font-semibold">클럽 정보를 불러오지 못했습니다</h1>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <div className="flex gap-3 mt-2">
                <button
                    onClick={reset}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    다시 시도
                </button>
                <Link
                    href="/clubs"
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                    클럽 목록
                </Link>
            </div>
        </div>
    )
}

export default ClubError
