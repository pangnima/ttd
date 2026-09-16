-- 20260907071645 0058d_request_opponent_default_from_plan
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0058 §5 — 대표 축에도 같은 규칙을 건다.
--
-- §4가 참가자 좌석을 세션 수락에서 파생시켰다면 이쪽은 대표(opponent_user_id)다.
-- 대표가 이미 일정을 수락해 뒀는데 다른 좌석 때문에 그 게임이 pending으로 태어나면,
-- 대표에게 참여를 다시 묻는 화면이 생긴다. finalize를 고치지 않고 트리거로 두는 이유는
-- 두 축의 규칙을 한자리(트리거 두 개)에 모아 두기 위해서다 — 쓰기 경로가 늘어도 따라온다.
create or replace function public.default_request_opponent_response()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'pending'
     and new.opponent_accepted_at is null
     and new.rotation_session_id is not null
     -- 세션 소유자는 좌석 행이 없어도 수락자로 센다(0057b)
     and public.rotation_seats_accepted(new.rotation_session_id, array[new.opponent_user_id])
  then
    new.opponent_accepted_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.default_request_opponent_response() from public, anon, authenticated;

drop trigger if exists match_requests_default_opponent_response on public.match_requests;
create trigger match_requests_default_opponent_response
  before insert on public.match_requests
  for each row execute function public.default_request_opponent_response();
