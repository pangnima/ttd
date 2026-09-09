import { redirect } from 'next/navigation'

/**
 * 확인 요청 허브는 Week 39에 철거됐다.
 *
 * 허브는 미확정 경기 전량의 작업 큐였지만, 같은 일이 매칭 룸·개인 경기 결과에도 있어
 * 하나의 경기를 끝내려면 화면을 왕복해야 했다. 이제 자리는 둘뿐이다 —
 * **진행 중인 매칭은 매칭 룸**(그 목록이 곧 작업 큐), **끝난 것은 개인 경기 결과**.
 *
 * 라우트는 남긴다: 북마크·뒤로가기·기존 알림 링크가 404 대신 매칭 리스트에 착지하도록.
 */
export default function MatchRequestsRedirect() {
    redirect('/match-rooms')
}
