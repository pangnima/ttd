'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Wand2 } from 'lucide-react'
import { generateMatchGame, computeDefaultNtrp, type GenerateResult } from '@/lib/match-games/auto-generate'
import type { FormCourt } from '@/lib/match-games/form-mapping'
import type { MatchType, User } from '@/types'

type AutoGeneratePanelProps = {
    courts: FormCourt[]
    attendees: User[]
    baseStart: string
    slotMinutes: number
    onApply: (result: GenerateResult) => void
}

// 자동 배치 컨트롤. 라운드 수만 입력받고, 코트 종류·시간 설정은 폼 상위 상태를 사용한다.
export function AutoGeneratePanel({ courts, attendees, baseStart, slotMinutes, onApply }: AutoGeneratePanelProps) {
    const [rounds, setRounds] = useState(3)

    const ready = courts.length > 0 && attendees.length > 0 && !Number.isNaN(rounds) && rounds > 0
    const defaultNtrp = attendees.length > 0 ? computeDefaultNtrp(attendees) : 0

    // 빈 값(전체 삭제)은 NaN으로 보관해 입력란을 비울 수 있게 하고, 자동 배치 시 ready 가드로 차단한다.
    const handleRoundsChange = (val: string) => {
        if (val === '') {
            setRounds(NaN)
            return
        }
        const num = parseInt(val, 10)
        if (isNaN(num) || num < 1 || num > 20) return
        setRounds(num)
    }

    const handleGenerate = () => {
        const result = generateMatchGame({
            courts: courts.map((c) => ({
                id: c.id,
                label: c.label,
                surface: c.surface,
                matchType: (c.matchType ?? 'singles') as MatchType,
            })),
            rounds,
            baseStart,
            slotMinutes,
            attendees,
        })
        onApply(result)
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground shrink-0">라운드</span>
                <Input
                    type="number"
                    min={1}
                    max={20}
                    value={Number.isNaN(rounds) ? '' : rounds}
                    onChange={(e) => handleRoundsChange(e.target.value)}
                    className="h-8 text-xs w-16"
                />
            </div>
            <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleGenerate}
                disabled={!ready}
            >
                <Wand2 className="w-3.5 h-3.5" /> 자동 배치
            </Button>
            <p className="text-xs text-muted-foreground">
                참석자 {attendees.length}명 · 코트 {courts.length}개 · 기준 NTRP {defaultNtrp.toFixed(1)}
                <span className="ml-1">(기존 게임 목록을 덮어씁니다)</span>
            </p>
        </div>
    )
}
