'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { ChevronDown, UserPlus } from 'lucide-react'
import type { User } from '@/types'

type PlayerSelectProps = {
    users: User[]
    value: string
    onChange: (userId: string) => void
    placeholder?: string
    onCreatePlayer?: (nickname: string) => string
}

export function PlayerSelect({ users, value, onChange, placeholder = '선수 선택', onCreatePlayer }: PlayerSelectProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({})
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setMounted(true) }, [])

    const selectedUser = users.find((u) => u.id === value)
    const filtered = users.filter(
        (u) => query === '' || u.nickname.toLowerCase().includes(query.toLowerCase())
    )
    const showCreateOption = !!onCreatePlayer && query.trim() !== ''

    const updatePosition = () => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
            })
        }
    }

    const handleOpen = () => {
        updatePosition()
        setOpen(true)
        setQuery('')
    }

    const handleClose = () => {
        setOpen(false)
        setQuery('')
    }

    const handleSelect = (userId: string) => {
        onChange(userId)
        handleClose()
    }

    const handleCreate = () => {
        if (!onCreatePlayer || !query.trim()) return
        const newId = onCreatePlayer(query.trim())
        onChange(newId)
        handleClose()
    }

    useEffect(() => {
        if (!open) return
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                const target = e.target as Element
                if (!target.closest('[data-player-dropdown]')) {
                    handleClose()
                }
            }
        }
        const handleScroll = () => updatePosition()
        document.addEventListener('mousedown', handleOutside)
        window.addEventListener('scroll', handleScroll, true)
        return () => {
            document.removeEventListener('mousedown', handleOutside)
            window.removeEventListener('scroll', handleScroll, true)
        }
    }, [open])

    const dropdown = (
        <div
            data-player-dropdown
            style={dropdownStyle}
            className="rounded-md border bg-background shadow-lg overflow-hidden"
        >
            <div className="max-h-48 overflow-y-auto">
                {filtered.length > 0 ? (
                    filtered.map((user) => (
                        <button
                            key={user.id}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                handleSelect(user.id)
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-1"
                        >
                            {user.nickname}
                            {user.id.startsWith('guest-') && (
                                <span className="text-xs text-muted-foreground">(게스트)</span>
                            )}
                        </button>
                    ))
                ) : (
                    !showCreateOption && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">검색 결과 없음</p>
                    )
                )}
            </div>

            {showCreateOption && (
                <>
                    {filtered.length > 0 && <div className="h-px bg-border" />}
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            handleCreate()
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-1.5 text-primary"
                    >
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>&apos;{query.trim()}&apos; 게스트로 추가</span>
                    </button>
                </>
            )}
        </div>
    )

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    value={open ? query : (selectedUser?.nickname ?? '')}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        if (!open) handleOpen()
                    }}
                    onFocus={handleOpen}
                    placeholder={placeholder}
                    className="h-8 text-sm pr-7"
                    readOnly={false}
                />
                <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {open && mounted && createPortal(dropdown, document.body)}
        </div>
    )
}
