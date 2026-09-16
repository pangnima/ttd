-- 20260910071225 0072_room_lineup_rotation_fix
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
create or replace function public.create_room_lineup(p_room_id uuid, p_games jsonb)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;
  if v_room.is_settled then raise exception 'room_already_closed'; end if;

  if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) < 1 then
    raise exception 'invalid_games';
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, p_games);
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.create_room_lineup(uuid, jsonb) from public;
revoke execute on function public.create_room_lineup(uuid, jsonb) from anon;
grant execute on function public.create_room_lineup(uuid, jsonb) to authenticated;

create or replace function public.replace_room_lineup(
  p_room_id uuid, p_request_ids uuid[], p_games jsonb
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_ids uuid[] := coalesce(p_request_ids, '{}');
  v_locked integer;
  v_count integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;

  select count(*) into v_locked
  from unnest(v_ids) as t(id)
  where not exists (
    select 1
    from match_requests req
    left join match_result_negotiations neg on neg.request_id = req.id
    where req.id = t.id
      and req.room_id = p_room_id
      and req.origin = 'lineup'
      and req.status = 'accepted'
      and jsonb_array_length(req.set_scores) = 0
      and coalesce(neg.result_status, 'none') = 'none'
      and not exists (
        select 1 from personal_matches pm
        where pm.source_request_id = req.id and jsonb_array_length(pm.set_scores) > 0
      )
  );
  if v_locked > 0 then raise exception 'lineup_locked'; end if;

  if array_length(v_ids, 1) is not null then
    delete from personal_matches where source_request_id = any(v_ids);
    delete from match_requests where id = any(v_ids);
  end if;

  v_count := public.insert_room_lineup_games(p_room_id, coalesce(p_games, '[]'::jsonb));
  perform public.recompute_match_room_settled(p_room_id);
  return v_count;
end;
$$;

revoke all on function public.replace_room_lineup(uuid, uuid[], jsonb) from public;
revoke execute on function public.replace_room_lineup(uuid, uuid[], jsonb) from anon;
grant execute on function public.replace_room_lineup(uuid, uuid[], jsonb) to authenticated;
