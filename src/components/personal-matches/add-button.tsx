'use client'

import { Plus } from 'lucide-react'

type AddButtonProps = {
    label: string
    onClick: () => void
    disabled?: boolean
}

// 메뉴 트리거(역할 선택 추가 버튼)와 같은 외형을 공유하기 위해 클래스를 내보낸다
export const ADD_BUTTON_CLASS =
    'w-full flex items-center justify-center gap-1.5 py-2.5 text-body2 font-medium rounded-md border border-input bg-muted text-foreground hover:bg-muted/70 hover:border-ring transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted disabled:hover:border-input'

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
            className={ADD_BUTTON_CLASS}
        >
            <Plus className="size-4" />
            {label}
        </button>
    )
}
