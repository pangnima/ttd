'use client'

type Option<T extends string> = { value: T; label: string }

type Props<T extends string> = {
    label: string
    options: [Option<T>, Option<T>]
    value: T | undefined
    onChange: (v: T | undefined) => void
}

/**
 * 복식 코트 사이드(애드/듀스) 선택 토글.
 * 선택한 선수 = 애드(백) 코트, 나머지 = 듀스(포). 미선택(undefined) = 둘 다 듀스 기본.
 * 이미 애드인 선수를 다시 누르면 해제(미지정)된다. 클럽 경기 토글 스타일을 차용.
 */
export function AdDeuceToggle<T extends string>({ label, options, value, onChange }: Props<T>) {
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-1">{label} 유저 선택</p>
            <div className="grid grid-cols-2 gap-1.5">
                {options.map((o) => {
                    const isAd = value === o.value
                    const side = isAd ? '애드(백)' : value ? '듀스(포)' : '미지정'
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onChange(isAd ? undefined : o.value)}
                            className={`flex items-center justify-between gap-1 px-2.5 py-2 text-xs rounded-md border transition-colors ${
                                isAd
                                    ? 'border-accent-lime text-foreground bg-accent-lime/10 font-semibold'
                                    : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                            }`}
                        >
                            <span className="truncate">{o.label}</span>
                            <span className="text-[10px] shrink-0">{side}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
