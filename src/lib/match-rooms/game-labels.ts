import type { MatchRoomGame, MatchRoomParticipantRef } from '@/types'
import type { TeamLabelSource } from '@/lib/personal-matches/labels'

/**
 * 방 게임 참가자 → 뷰어 관점 팀 라벨.
 *
 * 방 상세의 게임 행은 작성자(owner) 관점 한 벌이므로(0049), 상대팀 회원이 결과를 입력·확인할 때는
 * 팀을 뷰어 기준으로 뒤집어야 한다. 세트 값 자체는 propose_match_result가 호출자 관점을 서버에서
 * 정규화하니(0037) 여기서는 라벨만 맞추면 되고, 반전 로직을 새로 쓰지 않는다.
 *
 *  - 뷰어 = 작성자        : opponent/partner/opponent2 그대로
 *  - 뷰어 = 상대팀 회원   : 내 파트너 = 상대팀의 나머지 한 명, 상대팀 = 작성자 + 작성자 파트너
 *  - 뷰어 = 작성자 파트너 : 팀 구성은 그대로고 '나'만 바뀐다 — 파트너 자리에 작성자가 온다
 *  - 그 외(당사자 아님)   : 작성자 관점 (표시 전용)
 */
export function buildRoomGameLabels(game: MatchRoomGame, viewerId: string): TeamLabelSource {
    const byRole = (role: string): MatchRoomParticipantRef | undefined =>
        game.participants.find((p) => p.role === role)
    const opponent = byRole('opponent')
    const partner = byRole('partner')
    const opponent2 = byRole('opponent2')

    const ownerView: TeamLabelSource = {
        matchType: game.matchType,
        opponentName: opponent?.name ?? '',
        partnerName: partner?.name,
        opponent2Name: opponent2?.name,
    }
    if (game.ownerUserId === viewerId) return ownerView

    // 상대팀에 뷰어가 있으면 팀을 가로질러 반전한다 (단식은 파트너 슬롯이 없어 상대만 작성자로 바뀐다)
    const opponentTeam = [opponent, opponent2]
    const mySlot = opponentTeam.findIndex((p) => p?.userId === viewerId)
    if (mySlot >= 0) {
        const myPartner = opponentTeam[mySlot === 0 ? 1 : 0]
        return {
            matchType: game.matchType,
            opponentName: game.ownerName,
            partnerName: myPartner?.name,
            opponent2Name: partner?.name,
        }
    }

    // 팀 안쪽 반전 — 뷰어가 작성자의 파트너인 경우
    if (partner?.userId === viewerId) {
        return { ...ownerView, partnerName: game.ownerName }
    }

    return ownerView
}
