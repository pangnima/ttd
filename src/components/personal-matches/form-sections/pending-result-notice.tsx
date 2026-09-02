import { Hourglass } from 'lucide-react'
import type { PersonalMatchSetScore } from '@/types'

type Props = {
    // 수정 모드에서 기존 레코드가 보유한 세트 — 있으면 "유지됨" 안내로 바뀐다
    existingSets?: PersonalMatchSetScore[]
}

/**
 * 결과 미확정 안내 — 등록 폼은 세트 스코어를 받지 않으므로 저장 시 winner NULL(미확정)로 기록됨을 알린다.
 * 세트가 이미 있는 레코드를 수정할 때는 세트가 그대로 보존됨을 안내한다.
 */
export function PendingResultNotice({ existingSets = [] }: Props) {
    const hasSets = existingSets.length > 0
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Hourglass className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground break-keep">
                {hasSets ? (
                    <>
                        등록된 세트 스코어는 그대로 유지됩니다:{' '}
                        <span className="text-foreground font-medium tabular-nums">
                            {existingSets.map((s) => `${s.me}-${s.opp}`).join(', ')}
                        </span>
                    </>
                ) : (
                    <>
                        세트 스코어·승패는 저장 후 별도로 입력합니다.
                        지금 저장하면 <span className="text-foreground font-medium">결과 미확정</span>으로 기록되며 통계에는 반영되지 않습니다.
                    </>
                )}
            </p>
        </div>
    )
}
