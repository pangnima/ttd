'use client'

type Props = {
    error: Error & { digest?: string }
    reset: () => void
}

export default function GlobalError({ reset }: Props) {
    return (
        <html lang="ko">
            <body className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6 bg-background text-foreground">
                <p className="text-5xl font-bold text-destructive">오류 발생</p>
                <h1 className="text-xl font-semibold">예기치 못한 오류가 발생했습니다</h1>
                <p className="text-muted-foreground text-sm">잠시 후 다시 시도해 주세요.</p>
                <button
                    onClick={reset}
                    className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    다시 시도
                </button>
            </body>
        </html>
    )
}
