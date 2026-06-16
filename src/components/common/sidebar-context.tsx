'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type SidebarContextValue = {
    /** rail(아이콘만) 접힘 여부. md 미만에서는 의미 없음(모바일 시트 사용) */
    collapsed: boolean
    /** 사용자가 직접 접기/펼치기를 토글 — 이후 화면폭 자동 추종은 중단된다 */
    toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

// localStorage 키: '1'=접힘, '0'=펼침, 없으면 미설정(=화면폭 자동)
const STORAGE_KEY = 'sidebar:collapsed'
// xl 브레이크포인트(80rem=1280px) 이상이면 펼침, 미만이면 rail
const EXPAND_QUERY = '(min-width: 80rem)'

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    // SSR/첫 페인트는 펼침 기준으로 두고, mount 후 보정해 hydration mismatch를 피한다
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        const mql = window.matchMedia(EXPAND_QUERY)

        // 명시값이 있으면 그 값, 없으면 화면폭 기준 자동(xl 미만 → 접힘)
        // mount 직후 1회 보정으로 hydration mismatch를 피하는 의도된 동기 setState
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(stored !== null ? stored === '1' : !mql.matches)

        // 사용자 명시값이 없는 동안에만 화면폭 변화를 자동 추종
        const onChange = (e: MediaQueryListEvent) => {
            if (localStorage.getItem(STORAGE_KEY) === null) {
                setCollapsed(!e.matches)
            }
        }
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
    }, [])

    const toggle = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev
            // 토글 시점부터는 사용자 선택을 우선(자동 추종 중단)
            localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
            return next
        })
    }, [])

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar(): SidebarContextValue {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error('useSidebar는 SidebarProvider 내부에서만 사용할 수 있습니다')
    return ctx
}
