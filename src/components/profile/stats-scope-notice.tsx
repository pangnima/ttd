import { Info } from 'lucide-react'

export function StatsScopeNotice() {
    return (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border border-white/5 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>이 통계는 회원님이 속한 클럽의 경기만 포함합니다.</span>
        </div>
    )
}
