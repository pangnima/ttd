-- 20260917003936 0093_anon_rpc_rate_limit
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0093_anon_rpc_rate_limit.sql
-- Week 70 — anon RPC 6종의 시도 제한. Week 52·60·61이 의도적으로 연 열거(is_email_taken·resolve_login_email 등)는
-- "화면에서 실시간으로 말해 준다"는 UX와 맞바꾼 것이고, 그 대가가 시도 제한 부재였다(백로그 「보안·성능」).
-- 이 마이그레이션은 열거 자체를 닫지 않는다 — 속도만 제한한다.
--
-- 왜 DB 안인가: 6종은 브라우저가 anon 키로 PostgREST를 직접 부르므로(가입 폼의 debounce) 앱 서버를 거치지 않는
-- 경로가 있다. 그 경로까지 잡으려면 함수 안이 유일한 초크포인트다. 주체는 **로그인했으면 uid, 아니면 IP** —
-- IP는 Cloudflare가 붙이는 `cf-connecting-ip`(PostgREST가 request.headers GUC로 넘긴다, 위조 불가)이고 폴백은
-- x-forwarded-for 첫 홉이다.
--
-- ⚠ 알려진 한계: 서버 액션(로그인·가입·아이디 찾기)이 부르면 IP가 사용자가 아니라 **Vercel 이그레스 IP**라
-- 그 경로의 호출은 이그레스 IP 하나로 묶인다. 한도는 그 묶음이 정상 트래픽에 걸리지 않을 만큼 넉넉하게 잡았다
-- (로그인 30/분·아이디 찾기 10/분·중복 확인 60/분 — 이그레스 IP는 여러 개고 오픈 초기 규모에서는 닿지 않는다).
-- 트래픽이 커지면 서버 액션 경로를 service_role 클라이언트로 옮기고 앱이 Vercel의 x-forwarded-for로 제한하는
-- 구조(anon EXECUTE 전면 회수)가 다음 단계다 — 백로그.
--
-- 고정 윈도 카운터: (bucket, subject)마다 window_start·hits 한 행. 한도를 넘으면 `rate_limited`를 raise한다 —
-- raise가 트랜잭션을 되돌리므로 거절된 호출은 카운트되지 않지만 윈도는 그대로 남아 결과는 같다.

create table public.rpc_rate_limits (
    bucket       text        not null,
    subject      text        not null,
    window_start timestamptz not null default now(),
    hits         integer     not null default 0,
    primary key (bucket, subject)
);
alter table public.rpc_rate_limits enable row level security;   -- 정책 0개 = RPC 전용(match_room_secrets 관용구)
revoke all on public.rpc_rate_limits from public, anon, authenticated;

-- 주체 — uid ▸ cf-connecting-ip ▸ x-forwarded-for 첫 홉 ▸ 'unknown'(psql·MCP처럼 헤더가 없는 경로)
create or replace function public.throttle_subject()
returns text
language sql stable
set search_path = public
as $$
    select coalesce(
        auth.uid()::text,
        nullif(nullif(current_setting('request.headers', true), '')::jsonb ->> 'cf-connecting-ip', ''),
        nullif(split_part(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ''), ',', 1), ''),
        'unknown'
    );
$$;
revoke all on function public.throttle_subject() from public, anon, authenticated;

-- 카운터 — 한도를 넘으면 raise. 호출자는 SECURITY DEFINER 함수들뿐이라 클라이언트 EXECUTE는 전부 회수한다.
create or replace function public.throttle_hit(p_bucket text, p_limit integer, p_window interval)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_subject text := public.throttle_subject();
    v_hits integer;
begin
    insert into public.rpc_rate_limits as r (bucket, subject, window_start, hits)
    values (p_bucket, v_subject, now(), 1)
    on conflict (bucket, subject) do update
        set hits = case when r.window_start < now() - p_window then 1 else r.hits + 1 end,
            window_start = case when r.window_start < now() - p_window then now() else r.window_start end
    returning hits into v_hits;

    if v_hits > p_limit then
        raise exception 'rate_limited';
    end if;

    -- 오래된 행은 가끔 치운다 — 별도 크론 없이 호출의 1%가 청소를 맡는다
    if random() < 0.01 then
        delete from public.rpc_rate_limits where window_start < now() - interval '1 day';
    end if;
end;
$$;
revoke all on function public.throttle_hit(text, integer, interval) from public, anon, authenticated;

-- 6종을 plpgsql·VOLATILE로 바꿔 첫 줄에서 throttle_hit을 거친다. 본문은 0080·0081·0085·0086·클럽 초대의 것 그대로
-- (STABLE sql 함수 안에서는 INSERT를 실행할 수 없어 언어·휘발성만 바뀐다). 시그니처·반환형·anon EXECUTE는 유지.

create or replace function public.is_nickname_taken(p_nickname text, p_exclude_user_id uuid default null)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('is_nickname_taken', 60, interval '1 minute');
    return exists (
        select 1 from public.users u
        where lower(btrim(u.nickname)) = lower(btrim(p_nickname))
          and u.deleted_at is null
          and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
    );
end;
$$;

create or replace function public.is_email_taken(p_email text)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('is_email_taken', 60, interval '1 minute');
    return exists (
        select 1 from auth.users u
        where lower(btrim(u.email)) = lower(btrim(p_email))
    );
end;
$$;

create or replace function public.is_login_id_taken(p_login_id text)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('is_login_id_taken', 60, interval '1 minute');
    return exists (
        select 1 from public.users u
        where u.login_id = lower(btrim(p_login_id))
          and u.deleted_at is null
    );
end;
$$;

-- 로그인 경로(아이디 → 이메일). 아이디→이메일 열거를 여는 함수라 한도를 가장 낮게 둔다 — 로그인 액션에서만 1회 부른다
create or replace function public.resolve_login_email(p_login_id text)
returns text
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('resolve_login_email', 30, interval '1 minute');
    return (
        select a.email
        from public.users u
        join auth.users a on a.id = u.id
        where u.login_id = lower(btrim(p_login_id))
          and u.deleted_at is null
        limit 1
    );
end;
$$;

create or replace function public.find_login_id(p_name text, p_email text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('find_login_id', 10, interval '1 minute');
    return (
        select case
            when u.login_id is not null then
                jsonb_build_object(
                    'kind', 'login_id',
                    'masked', left(u.login_id, 2) || repeat('*', char_length(u.login_id) - 2)
                )
            when a.raw_app_meta_data->'providers' ? 'email' then
                jsonb_build_object('kind', 'email_only')
            else
                jsonb_build_object('kind', 'social', 'provider', a.raw_app_meta_data->>'provider')
        end
        from public.users u
        join auth.users a on a.id = u.id
        where lower(btrim(u.name)) = lower(btrim(p_name))
          and lower(btrim(a.email)) = lower(btrim(p_email))
          and u.deleted_at is null
        limit 1
    );
end;
$$;

create or replace function public.get_invite_preview(p_token uuid)
returns table(club_id uuid, name text, region text, logo_url text, is_public boolean)
language plpgsql volatile security definer
set search_path = public
as $$
begin
    perform public.throttle_hit('get_invite_preview', 30, interval '1 minute');
    return query
        select c.id, c.name, c.region, c.logo_url, c.is_public
        from public.club_invites i
        join public.clubs c on c.id = i.club_id
        where i.token = p_token and i.is_active = true
          and (i.expires_at is null or i.expires_at > now());
end;
$$;
