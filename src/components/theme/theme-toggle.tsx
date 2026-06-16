'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
    /** rail(접힘) 상태 — 아이콘만 중앙 정렬하고 라벨은 페이드 아웃 */
    collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setMounted(true) }, [])

    if (!mounted) return <div className="h-10" />

    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? '라이트 모드' : '다크 모드'}
            className={cn(
                'flex items-center h-10 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                collapsed ? 'gap-0 justify-center w-10 mx-auto px-0' : 'gap-3 w-full px-3'
            )}
        >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span
                className={cn(
                    'overflow-hidden whitespace-nowrap transition-all duration-200',
                    collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
                )}
            >
                {isDark ? '라이트 모드' : '다크 모드'}
            </span>
        </button>
    )
}
