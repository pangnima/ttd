-- 0024_personal_match_doubles_details.sql
--- 개인 경기 복식 고도화: 선수별 NTRP(파트너/상대2) + 애드/듀스 코트 위치.
--- - partner_ntrp / opponent2_ntrp: 복식 선수별 추정 NTRP(1.0~7.0). 개인 레이팅 팀-대-팀 블렌드에 사용.
---   (기존 opponent_ntrp는 단식 상대 / 복식 상대1의 NTRP로 사용한다.)
--- - my_ad_player / opponent_ad_player: 애드(백) 코트를 맡은 선수 역할. null = 미지정(둘 다 듀스 기본).
---   저장 전용(향후 사이드별 성적 분석용), 현재 통계 미반영.

alter table public.personal_matches
  add column partner_ntrp numeric
    check (partner_ntrp is null or (partner_ntrp >= 1.0 and partner_ntrp <= 7.0)),
  add column opponent2_ntrp numeric
    check (opponent2_ntrp is null or (opponent2_ntrp >= 1.0 and opponent2_ntrp <= 7.0)),
  add column my_ad_player text
    check (my_ad_player in ('me', 'partner')),
  add column opponent_ad_player text
    check (opponent_ad_player in ('opponent', 'opponent2'));
