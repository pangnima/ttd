'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { NtrpField } from '@/lib/personal-matches/validate-input'
import { PlayerNtrpField } from '@/components/personal-matches/player-ntrp-field'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'

// 선수 1명의 선택값·NTRP 상태와 변경 핸들러 묶음 (prop drilling 축소용)
export type PlayerFieldState = {
    player: PlayerPickerValue
    onPlayerChange: (v: PlayerPickerValue) => void
    ntrp: string
    onNtrpChange: (v: string) => void
}

type PlayersSectionProps = {
    isDoubles: boolean
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    // 매칭 리스트 방 참가자 — 방 게임 구성·모집형 채우기에서 자동완성 최상단 그룹
    roomParticipants?: OpponentCandidate[]
    opponent: PlayerFieldState
    partner: PlayerFieldState
    opponent2: PlayerFieldState
    // 로그인 유저 id — 전달 시 모든 선수 필드에 플랫폼 전체 회원 검색 활성화 (상호 확인 요청 대상 지정)
    searchSelfUserId?: string
    // 상호 확인 플로우 — 회원 참가자의 NTRP는 수락 시 서버 파생이므로 해당 필드 입력란 숨김
    hideNtrpFor?: NtrpField[]
}

/**
 * 경기 타입(단식/복식)에 따라 선수 입력란을 분기 렌더링 — 모든 슬롯이 항상 보이고 NTRP까지 필수.
 * 단식은 상대 1명, 복식은 내 팀(파트너) + 상대팀(상대1·상대2) 박스로 구성한다.
 * (모집형은 RecruitingPlayersSection이 열린 슬롯만 그린다)
 */
export function PlayersSection({
    isDoubles, candidates, pastOpponents, roomParticipants, opponent, partner, opponent2, searchSelfUserId, hideNtrpFor = [],
}: PlayersSectionProps) {
    const field = (label: string, s: PlayerFieldState, key: NtrpField, placeholder: string) => (
        <PlayerNtrpField
            label={`${label} *`}
            candidates={candidates}
            pastOpponents={pastOpponents}
            roomParticipants={roomParticipants}
            player={s.player}
            onPlayerChange={s.onPlayerChange}
            ntrp={s.ntrp}
            onNtrpChange={s.onNtrpChange}
            ntrpRequired
            placeholder={placeholder}
            searchSelfUserId={searchSelfUserId}
            hideNtrp={hideNtrpFor.includes(key)}
        />
    )

    if (!isDoubles) {
        return field('상대', opponent, 'opponent', '상대방 이름 또는 닉네임')
    }
    return (
        <div>
            {/* 내 팀 (나 + 파트너) */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-caption font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">내 팀</span>
                    <span className="text-caption text-muted-foreground">나 + 파트너</span>
                </div>
                {field('내 파트너', partner, 'partner', '파트너 이름 또는 닉네임')}
            </div>

            {/* 상대팀 (상대1 + 상대2) */}
            <div className="mt-6 border-t border-border pt-6 space-y-3">
                <div className="flex items-center gap-2">
                    <span className="text-caption font-semibold px-2 py-0.5 rounded bg-secondary text-foreground">상대팀</span>
                    <span className="text-caption text-muted-foreground">
                        상대1 + 상대2 · 참가자를 모두 채우면 상대팀 회원이 대표로 확인합니다
                    </span>
                </div>
                {field('상대팀 선수 1', opponent, 'opponent', '상대방 이름 또는 닉네임')}
            </div>
            <div className="mt-6 border-t border-border pt-6">
                {field('상대팀 선수 2', opponent2, 'opponent2', '상대방 이름 또는 닉네임')}
            </div>
        </div>
    )
}
