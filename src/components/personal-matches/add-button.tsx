'use client'

import { Plus } from 'lucide-react'

type AddButtonProps = {
    label: string
    onClick: () => void
    disabled?: boolean
}

/**
 * 리스트(참가자·게임·세트) 하단의 풀폭 추가 버튼.
 * 채워진 secondary surface + 실선 테두리로 버튼 affordance를 분명히 한다(점선/흐린 텍스트 지양).
 */
export function AddButton({ label, onClick, disabled = false }: AddButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-md border border-input bg-muted text-foreground hover:bg-muted/70 hover:border-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted disabled:hover:border-input"
        >
            <Plus className="size-4" />
            {label}
        </button>
    )
}
