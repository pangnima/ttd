'use client'

import { useEffect } from 'react'

/**
 * 첫 로드에서 `#id`로 스크롤한다. 앱 안 링크(PageGuide → /guide#id)는 라우터가 알아서 옮기지만,
 * 주소창·공유 링크로 **처음 여는** 경우에는 스크롤 컨테이너가 `<main>`이라 브라우저의 해시 이동이 닿지 않았다.
 * 렌더 결과에는 손대지 않으므로 hydration과 무관하다.
 */
export function GuideHashScroll() {
    useEffect(() => {
        const id = window.location.hash.slice(1)
        if (!id) return
        document.getElementById(id)?.scrollIntoView({ block: 'start' })
    }, [])
    return null
}
