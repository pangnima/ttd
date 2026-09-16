-- 20260907070818 0058_rotation_session_pool_invite
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0058 — 로테이션 세션의 참가자 초대·제거. 정본은 supabase/migrations/0058_rotation_session_pool_invite.sql

create or replace function public.add_rotation_session_player(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
  v_u users%rowtype;
  v_ntrp numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is not null then raise exception 'room_session_invite_unsupported'; end if;

  if v_s.user_id <> v_uid and not exists (
    select 1 from rotation_session_participants p
    where p.session_id = p_session_id and p.user_id = v_uid
      and p.participation_status = 'accepted'
  ) then
    raise exception 'not_session_participant';
  end if;

  if p_user_id = v_s.user_id then raise exception 'already_in_pool'; end if;
  if not public.is_active_member(p_user_id) then raise exception 'invalid_player'; end if;
  if exists (
    select 1 from jsonb_array_elements(v_s.players) e
    where nullif(e->>'userId', '')::uuid = p_user_id
  ) then raise exception 'already_in_pool'; end if;

  select * into v_u from users where id = p_user_id;
  v_ntrp := coalesce(public.derive_public_ntrp(v_u), v_u.ntrp);
  if v_ntrp is null then raise exception 'ntrp_missing'; end if;

  update rotation_sessions
  set players = players || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'userId', v_u.id, 'name', v_u.name, 'hand', v_u.dominant_hand, 'ntrp', v_ntrp
  )))
  where id = p_session_id;
end;
$$;

revoke all on function public.add_rotation_session_player(uuid, uuid) from public;
revoke execute on function public.add_rotation_session_player(uuid, uuid) from anon;
grant execute on function public.add_rotation_session_player(uuid, uuid) to authenticated;

comment on function public.add_rotation_session_player(uuid, uuid) is
  '로테이션 일정(방 밖 세션)의 선수 풀에 회원을 초대 (0058). 좌석 생성·재초대 복귀는 0057 트리거가 한다.';

create or replace function public.remove_rotation_session_player(p_session_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s rotation_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_s from rotation_sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_s.room_id is not null then raise exception 'room_session_invite_unsupported'; end if;
  if v_s.user_id <> v_uid then raise exception 'not_session_owner'; end if;

  if not exists (
    select 1 from jsonb_array_elements(v_s.players) e
    where nullif(e->>'userId', '')::uuid = p_user_id
  ) then raise exception 'not_in_pool'; end if;

  update rotation_sessions
  set players = coalesce((
    select jsonb_agg(e) from jsonb_array_elements(players) e
    where nullif(e->>'userId', '')::uuid is distinct from p_user_id
  ), '[]'::jsonb)
  where id = p_session_id;
end;
$$;

revoke all on function public.remove_rotation_session_player(uuid, uuid) from public;
revoke execute on function public.remove_rotation_session_player(uuid, uuid) from anon;
grant execute on function public.remove_rotation_session_player(uuid, uuid) to authenticated;

comment on function public.remove_rotation_session_player(uuid, uuid) is
  '로테이션 일정(방 밖 세션)의 선수 풀에서 회원 제거 — 소유자만 (0058). 본인이 빠지는 길은 respond_rotation_plan(거절)이다.';
