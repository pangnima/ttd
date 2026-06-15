-- 0025_personal_match_drop_match_level_ad.sql
--- 애드/듀스 코트를 매치 레벨이 아니라 세트별로 받도록 변경(동호인 경기는 세트마다 사이드가 바뀜).
--- 세트별 애드/듀스는 set_scores(jsonb) 각 원소의 myAd/oppAd 필드로 저장하므로,
--- 0024에서 추가했던 매치 레벨 컬럼은 제거한다.

alter table public.personal_matches
  drop column my_ad_player,
  drop column opponent_ad_player;
