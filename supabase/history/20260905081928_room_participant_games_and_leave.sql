-- 20260905081928 room_participant_games_and_leave
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0054_room_participant_games_and_leave.sql
-- 매칭 룸: (1) 참가자도 비회원 상대 게임을 기록할 수 있게, (2) 방 나가기 경로 신설.

drop policy if exists personal_matches_insert on public.personal_matches;
create policy personal_matches_insert on public.personal_matches
  for insert with check (
    user_id = auth.uid()
    and (room_id is null or public.is_room_participant(room_id))
  );

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
  if v_room.host_user_id = v_uid then raise exception 'host_cannot_leave'; end if;

  update match_room_members
  set status = 'declined', responded_at = now()
  where room_id = p_room_id and user_id = v_uid and role <> 'host';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'not_room_member'; end if;

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
