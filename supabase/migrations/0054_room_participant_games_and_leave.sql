-- 0054_room_participant_games_and_leave.sql
-- 매칭 룸: (1) 참가자도 비회원 상대 게임을 기록할 수 있게, (2) 방 나가기 경로 신설.
--
-- (1) 왜 필요한가
--   0049가 참가자의 방 게임을 열었지만 그 경로는 create_room_game(회원 상대 전용)뿐이었다.
--   비회원과 친 게임은 자유 기록(personal_matches 직접 insert)이어야 하는데, INSERT 정책만
--   방장 소유 방으로 묶여 있어 참가자는 남길 수 없었다. UPDATE는 0049에서 이미 참가자로
--   완화됐으므로(is_room_participant) INSERT를 대칭으로 맞춘다.
--   "남의 방 room_id를 임의로 붙이는 경로"는 is_room_participant가 그대로 막는다 —
--   입장(joined)하지 않은 방에는 여전히 기록을 붙일 수 없다.
--
-- (2) 왜 필요한가
--   비밀번호 입장이 곧 player/joined인데(0048) 나가는 경로가 없었다. respond_room_invite(false)는
--   invited 행만 전이하고 match_room_members에는 UPDATE/DELETE 정책이 없어 클라이언트가 자기 행을
--   손댈 수도 없다. 잘못 들어간 방의 명단·로테이션 풀에 영구히 남는다.

-- ── 1) 방 게임 INSERT를 참가자로 완화 (UPDATE 정책과 대칭) ──
drop policy if exists personal_matches_insert on public.personal_matches;
create policy personal_matches_insert on public.personal_matches
  for insert with check (
    user_id = auth.uid()
    and (room_id is null or public.is_room_participant(room_id))
  );

-- ── 2) 방 나가기 ──
-- 기록은 남기고 명단에서만 빠진다(room_id를 푸는 것은 방장의 '리스트에서 내리기'가 하는 일이다).
-- 나간 뒤에는 is_room_participant가 거짓이 되어 그 방 기록을 더는 수정할 수 없다 —
-- 다시 비밀번호로 입장하면(declined → joined upsert, 0050) 원래대로 돌아온다.
create or replace function public.leave_match_room(p_room_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_s rotation_sessions%rowtype;
  v_rows int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  -- 방장은 나갈 수 없다 — 방을 없애려면 '매칭 리스트에서 내리기'를 쓴다
  if v_room.host_user_id = v_uid then raise exception 'host_cannot_leave'; end if;

  update match_room_members
  set status = 'declined', responded_at = now()
  where room_id = p_room_id and user_id = v_uid and role <> 'host';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'not_room_member'; end if;

  -- 미확정 로테이션 방이면 선수 풀에서도 뺀다 (join_match_room_as_player의 append와 대칭)
  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if found then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(v_s.players) e
      where e->>'userId' is distinct from v_uid::text
    ), '[]'::jsonb)
    where id = v_s.id;
  end if;
end;
$$;

revoke all on function public.leave_match_room(uuid) from public;
revoke execute on function public.leave_match_room(uuid) from anon;
grant execute on function public.leave_match_room(uuid) to authenticated;
