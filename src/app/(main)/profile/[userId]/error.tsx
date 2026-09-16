'use client'

import Link from 'next/link'
import { CTA_LINK } from '@/lib/dashboard/tokens'

type Props = {
    error: Error & { digest?: string }
    reset: () => void
}

export function ProfileError({ error, reset }: Props) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-display font-extrabold text-destructive">오류</p>
            <h1 className="text-h2 font-bold">프로필을 불러오지 못했습니다</h1>
            <p className="text-body2 text-muted-foreground">{error.message}</p>
            <div className="flex gap-3 mt-2">
                <button
                    onClick={reset}
                    className={CTA_LINK}
                >
                    다시 시도
                </button>
                <Link
                    href="/match-rooms"
                    className="rounded-md border px-4 py-2 text-body2 font-medium hover:bg-accent transition-colors"
                >
                    매칭 리스트
                </Link>
            </div>
        </div>
    )
}

export default ProfileError
