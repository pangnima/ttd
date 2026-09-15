-- 0086 — 아이디 찾기 (Week 61)
--
-- 0085가 로그인 식별자를 아이디로 바꾸자 "아이디를 잊은 사람"이 생겼다. 대중 서비스의 1차 화면과 같은
-- 형태로 간다 — **이름 + 이메일을 맞추면 아이디를 마스킹해 보여준다**(`na*****`). 메일을 보내지 않는
-- 이유는 둘이다. ① Supabase 기본 SMTP는 조직 팀원 주소에만 발송하므로 커스텀 SMTP가 붙기 전에는
-- 실사용자에게 닿지 않는다(비밀번호 재설정 메일도 같은 처지). ② 이메일 로그인이 살아 있어(login_id는
-- null 허용) 아이디 찾기는 편의 기능이고, 마스킹만으로 "아 그 아이디였지"를 떠올리는 것이 목적이다.
-- 전체 아이디를 이메일 인증 코드로 주는 2단계는 SMTP 이후로 미뤘다(CLAUDE.md 백로그).
--
-- **마스킹은 여기서만 한다.** anon RPC가 원문을 돌려주면 curl로 치는 사람에게 아이디가 새므로,
-- 함수 밖으로는 마스킹된 값만 나간다(앞 2자 + `*`, 길이는 유지 — 대중 서비스도 길이는 노출한다).
-- 아이디는 4자 이상(0085 CHECK)이라 `*`가 최소 2자다.
--
-- 반환은 jsonb 넷 중 하나다:
--   {kind:'login_id', masked}  — 아이디가 있는 회원
--   {kind:'email_only'}         — 비밀번호 계정인데 아이디를 아직 안 정한 회원(0085 이전 가입·프로필에서 미설정)
--   {kind:'social', provider}   — 비밀번호 identity가 없는 소셜 전용 계정(구글) — 아이디도 비밀번호도 없다
--   null                        — 이름·이메일 불일치 또는 탈퇴
-- 화면은 셋을 각각 "아이디 안내 / 이메일로 로그인하세요 / Google로 로그인하세요"로 그린다.
--
-- 이메일의 권위는 `auth.users`다(0081과 같은 이유 — 탈퇴는 public.users.email만 치환한다). 이름은
-- `public.users.name`을 `lower(btrim())`으로 비교한다(한글이라 대소문자는 무관하지만 앞뒤 공백은 흔하다).
-- 앱의 `validateName`(숫자 금지, 0081)은 여기 적용하지 않는다 — 이름에 숫자가 있는 기존 계정도 찾아야 한다.
--
-- ⚠ anon EXECUTE를 허용한다(로그인 이전 화면용 — 레포 기본 규칙의 명시적 예외). 열거 관점에서는
--    `is_email_taken`(0081, 이메일만으로 판정)보다 면적이 작다 — 이름과 이메일 **쌍**이 맞아야 무엇이든
--    돌아오고, 돌아오는 것도 마스킹된 아이디뿐이다. 시도 제한은 없다(프로젝트 전반의 미해결 항목).
--    소셜/이메일 계정 종류가 노출되는 것도 대가에 포함된다.

create or replace function public.find_login_id(p_name text, p_email text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
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
  limit 1;
$$;

comment on function public.find_login_id(text, text) is
  '아이디 찾기(0086). 이름+이메일이 맞으면 마스킹된 아이디(앞 2자 + *) 또는 계정 종류(email_only/social)를 jsonb로, 아니면 null. 마스킹은 이 함수 안에서만 한다 — anon EXECUTE라 원문이 나가면 안 된다. 열거 대가는 0086 머리말.';

revoke all on function public.find_login_id(text, text) from public;
grant execute on function public.find_login_id(text, text) to anon, authenticated;
