import {
    enteredGameLabel, enteredGameLine, nextGroupSeq, summarizeEntered, type EnteredRotationGame,
} from '@/lib/personal-matches/rotation-entered'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = { games: EnteredRotationGame[] }

/**
 * 게임 빌더 상단의 **읽기 전용** '이 일정에 등록된 게임' 목록 (0063, 0064에서 세션 전체로 확대).
 *
 * 빌더는 열 때마다 빈 상태라 사용자가 같은 게임을 다시 넣기 쉬웠고, DB도 그것을 막지 않는다
 * (로테이션 파생 요청은 pending 중복 유니크 인덱스에서 제외된다 — 0056).
 * 0064부터는 **다른 참가자가 넣은 게임까지** 보인다 — 종전에는 내 것만 보여서 둘이 같은 물리 게임을
 * 각자 넣는 중복을 눈으로 막을 수 없었다. 그래서 남의 게임에는 입력자 이름을 붙인다.
 * 여기 표시하는 '새 게임은 N번부터'의 N이 저장 시 서버로 가는 선점 값이기도 하다(nextGroupSeq).
 */
export function EnteredGamesBlock({ games }: Props) {
    if (games.length === 0) return null
    const { awaiting } = summarizeEntered(games)
    const nextSeq = nextGroupSeq(games)

    return (
        <div className="rounded-[8px] border border-border bg-muted/40 p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <p className={TYPO.h4}>이 일정에 등록된 게임 {games.length}건</p>
                <p className="text-caption text-muted-foreground">새 게임은 {nextSeq}번부터</p>
            </div>

            <ul className="space-y-1.5">
                {games.map((g) => (
                    <li key={g.groupSeq} className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                            <span className="text-caption text-muted-foreground shrink-0">{enteredGameLabel(g)}</span>
                            <span className="text-caption text-foreground truncate ml-1.5">{enteredGameLine(g)}</span>
                            {!g.enteredByMe && (
                                <span className="text-caption text-muted-foreground ml-1.5">({g.enteredByName.trim() || '참가자'} 입력)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <GameScoreChips sets={g.sets} />
                            {g.awaitingConsent && (
                                <span className="px-1.5 py-0.5 rounded-[4px] text-micro font-semibold bg-spot/15 text-spot">
                                    수락 대기
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {awaiting > 0 && (
                <p className="text-caption text-muted-foreground break-keep">
                    &lsquo;수락 대기&rsquo; 게임은 회원이 참여를 수락하면 모두의 기록에 추가됩니다. 다시 입력하지 않아도 됩니다.
                </p>
            )}
        </div>
    )
}
