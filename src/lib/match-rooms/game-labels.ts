import type { MatchRoomGame, MatchRoomParticipantRef, PersonalMatchSetScore } from '@/types'
import type { TeamLabelSource } from '@/lib/personal-matches/labels'
import { isRoomGameParty } from '@/lib/match-rooms/game-status'
import { invertSetScores } from '@/lib/personal-matches/perspective'

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

/**
 * 방 상세 게임 행에 찍히는 팀 라인.
 *
 * **'나'는 이 게임의 당사자에게만 쓴다.** 방에는 이 게임과 무관한 참가자도 들어와 있고
 * (정원이 없어 한 방에서 여러 조합이 돈다, 0048), 그들에게까지 작성자 자리를 '나'로 바꾸면
 * 남의 게임이 자기 게임처럼 보인다. 제3자에게는 작성자 관점 이름을 그대로 보여준다.
 */
export function buildRoomGameLine(game: MatchRoomGame, viewerId: string): string {
    const by = (role: string) => game.participants.find((p) => p.role === role)?.name

    if (game.ownerUserId === viewerId || !isRoomGameParty(game, viewerId)) {
        const mine = [game.ownerName, by('partner')].filter(Boolean).join(' · ')
        return joinTeams(mine, [by('opponent'), by('opponent2')])
    }

    const labels = buildRoomGameLabels(game, viewerId)
    const mine = ['나', labels.partnerName].filter(Boolean).join(' · ')
    return joinTeams(mine, [labels.opponentName, labels.opponent2Name])
}

function joinTeams(mine: string, opponents: Array<string | undefined>): string {
    const theirs = opponents.filter(Boolean).join(' · ')
    return `${mine} vs ${theirs || '(참가자 미정)'}`
}

/** 뷰어가 이 게임에서 상대팀(작성자 반대편)에 서 있는가 — 라벨·스코어를 함께 뒤집는 기준 */
function viewerIsOnOpponentTeam(game: MatchRoomGame, viewerId: string): boolean {
    return game.participants.some(
        (p) => (p.role === 'opponent' || p.role === 'opponent2') && p.userId === viewerId,
    )
}

/**
 * 게임 행에 찍히는 스코어 — **팀 라인과 같은 관점이어야 한다.**
 *
 * 방 상세가 내려주는 세트는 대표 게임(작성자 행)의 값이라 상대팀 회원에게는 승패가 뒤집혀 있다.
 * 라인만 뷰어 기준으로 돌리고 스코어를 그대로 두면 진 사람이 WIN 배지를 보게 된다.
 * 같은 팀(작성자 파트너)은 me/opp가 같으므로 반전하지 않는다.
 */
export function buildRoomGameSets(game: MatchRoomGame, viewerId: string): PersonalMatchSetScore[] {
    return viewerIsOnOpponentTeam(game, viewerId) ? invertSetScores(game.setScores) : game.setScores
}
