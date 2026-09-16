'use client'

import Link from 'next/link'
import { CTA_LINK } from '@/lib/dashboard/tokens'

type Props = {
    error: Error & { digest?: string }
    reset: () => void
}

/**
 * `(main)` 공통 오류 경계 — 자기 `error.tsx`가 없는 페이지들의 백스톱.
 *
 * 이것이 없으면 프로필 설정·매칭 리스트·매칭 룸·참여 중인 매칭·내 경기 결과·클럽 목록의 예외가
 * `app/global-error.tsx`까지 올라간다. 그쪽은 **자체 `<html>`을 그려 루트 레이아웃을 통째로 대체**해
 * 헤더·사이드바가 사라지고 원인 문구도 감춘다(Week 56에 실제로 그렇게 죽었다).
 * 여기서 잡으면 레이아웃이 살아 있어 사용자가 다른 화면으로 걸어 나갈 수 있다.
 *
 * 하위에 더 가까운 경계(`clubs/[clubId]`, `clubs/[clubId]/dashboard`, `profile/[userId]`)가 있으면
 * 그쪽이 먼저 잡는다. 이 파일은 그 셋이 **스스로 렌더하다 터졌을 때**의 뒷자리이기도 하다.
 *
 * ⚠ **`(main)/layout.tsx`가 던지면 여기서 못 잡는다** — 레이아웃 에러는 형제가 아니라 상위 경계로
 * 간다. 그 레이아웃은 `getUser` + users select + `fetchRoomQueue`를 돌리므로 여전히 global-error 소관.
 */
export function MainError({ error, reset }: Props) {
    // (main)/layout.tsx의 <main>이 이미 패딩·스크롤을 두르므로 컨테이너를 다시 두지 않는다
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-display font-extrabold text-destructive">오류</p>
            <h1 className="text-h2 font-bold">화면을 불러오지 못했습니다</h1>
            <p className="text-body2 text-muted-foreground break-keep">{error.message}</p>
            <div className="flex gap-3 mt-2">
                <button
                    onClick={reset}
                    className={CTA_LINK}
                >
                    다시 시도
                </button>
                {/* 클럽은 동결 상태라 탈출구는 매칭 쪽으로 둔다 */}
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

export default MainError
