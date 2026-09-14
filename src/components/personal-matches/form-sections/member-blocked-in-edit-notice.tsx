import { Users } from 'lucide-react'

/**
 * 방 밖 기록을 **수정**하다 회원을 골랐을 때의 안내 (N-2, Week 53).
 *
 * 신규 직접 기록은 회원이 끼면 그 자리에서 비노출 방을 만들지만(0082), 이미 저장된 방 밖 행은
 * 방으로 옮길 길이 없다 — 상대에게 남는 기록인데 동의도 확인도 없이 붙게 된다.
 * 서버(updatePersonalMatchAction)도 같은 술어로 거절하므로 여기서는 이유와 대안만 말한다.
 */
export function MemberBlockedInEditNotice() {
    return (
        <div className="flex items-start gap-2.5 rounded-lg border border-spot/40 bg-spot/10 px-3 py-2.5">
            <Users className="w-4 h-4 text-spot shrink-0 mt-0.5" />
            <p className="text-caption text-muted-foreground break-keep">
                <span className="text-foreground font-medium">저장된 기록에는 회원을 넣을 수 없습니다.</span>{' '}
                상대에게도 남는 기록이라 참여 동의와 결과 확인이 필요합니다 — 이 기록은 비회원으로 두고,
                회원과 친 경기는 새 직접 기록에서 회원을 고르면 매칭이 만들어집니다.
            </p>
        </div>
    )
}
