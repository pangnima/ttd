/**
 * 같은 날짜·시각 중복 일정 감지 (순수 함수).
 *
 * 사용자가 겪은 문제는 "같이 치는 사람들이 서로 모른 채 같은 일정을 두 번 만든다"였다.
 * 0057의 참여 초대가 **모르는 것**을 없앤다면, 이 경고는 **내가 이미 잡아 둔 일정**을 잊고
 * 다시 만드는 쪽을 막는다.
 *
 * 판정은 날짜 + 시각 **정확 일치**다. 경기 시각은 시 단위(`HH:00`)로만 입력받으므로
 * 겹침 구간을 계산할 필요가 없고, '경기 길이'라는 개념을 새로 만들지도 않는다.
 */

export type ScheduleSlot = {
    playedAt: string        // "2025-04-12"
    playedTime?: string     // "19:00" — 없으면 시각 미정이라 충돌 판정에서 빠진다
    label: string           // 카드에 보여줄 한 줄 ("남자08 · 하드" 등)
}

/** 시 단위 비교 키 — 'HH:MM:SS'로 들어와도 같은 시각으로 본다 */
function hourOf(time?: string): string | null {
    const hh = time?.slice(0, 2)
    return hh && /^\d{2}$/.test(hh) ? hh : null
}

/**
 * 같은 날짜·시각에 이미 잡혀 있는 일정. 수정 중인 기록 자신은 `excludeIds`로 뺀다.
 * 대상은 **미확정 일정**(확인 요청 허브가 담는 집합)뿐이다 — 이미 끝나 확정된 경기와의
 * 시각 일치는 중복 일정이 아니라 그날 여러 코트에서 친 기록일 수 있다.
 */
/** 경고 문구의 목록 부분 — 같은 이름은 한 번만, 넷을 넘으면 「외 N건」(U-12: 로테이션 게임은 같은 상대가 반복된다) */
export function formatScheduleConflicts(conflicts: ScheduleSlot[], max = 4): string {
    const labels = [...new Set(conflicts.map((c) => c.label))]
    const shown = labels.slice(0, max)
    const rest = labels.length - shown.length
    return rest > 0 ? `${shown.join(' / ')} 외 ${rest}건` : shown.join(' / ')
}

export function findScheduleConflicts(
    slots: ScheduleSlot[],
    playedAt: string,
    playedTime: string,
): ScheduleSlot[] {
    const hour = hourOf(playedTime)
    if (!playedAt || !hour) return []
    return slots.filter((s) => s.playedAt === playedAt && hourOf(s.playedTime) === hour)
}
