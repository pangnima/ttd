-- 0070_room_kick_hard_block.sql — 강퇴는 방에서 완전히 끊는다 (Week 41)
--
-- 증상: 방장이 내보낸 사람이 룸 URL을 열면 방 내용이 그대로 보인다. 참가는 막혀 있지만
--       명단·게임 목록·헤더를 전부 읽을 수 있어 "내보냈다"는 말과 화면이 어긋난다.
--
-- 원인: get_match_room_detail의 게이트가 'declined'만 막고 'removed'는 통과시킨다(0067·0068).
--       0068이 그렇게 둔 이유는 **결과 확인·이의 UI가 룸 안에만 있어서**였다 — 막으면 강퇴자가
--       좌석인 게임은 만장일치가 채워지지 않아 방이 영영 정산되지 않는다.
--
-- 결정: 그 딜레마를 게이트가 아니라 **강퇴 자격**에서 끊는다.
--   · 이 방의 게임에 이미 배정된 사람은 내보낼 수 없다(member_has_games).
--   · 배정된 게임이 하나도 없는 사람만 내보낼 수 있고, 그 사람은 방에서 할 일이 없으므로
--     상세를 막아도 잃는 것이 없다.
--   그 결과 "강퇴자는 방을 볼 수 없다"가 예외 없이 참이 되고, 남은 사람끼리 남의 승패를
--   확정하는 일도 생기지 않는다(결과는 좌석 만장일치라는 0060 규칙을 건드리지 않는다).
--
-- 강퇴의 나머지 성질은 그대로다: 비밀번호를 알아도 재입장 불가(join_match_room_as_player),
-- 트리거 keep_removed_room_member 안전망, 해제는 방장의 재초대뿐(0068 §5).
-- ⚠ 스스로 나간 사람(declined)이 이미 게임을 친 경우의 같은 교착은 여기서 다루지 않는다(백로그).


-- ════════════════════════════════════════════════════════════════
-- §1 kick_room_member — 배정된 경기가 있으면 내보내지 않는다
-- ════════════════════════════════════════════════════════════════
create or replace function public.kick_room_member(p_room_id uuid, p_target_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_m match_room_members%rowtype;
  v_s rotation_sessions%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  if v_room.host_user_id <> v_uid then raise exception 'not_room_host'; end if;

  select * into v_m from match_room_members
  where room_id = p_room_id and user_id = p_target_user_id for update;
  if not found then raise exception 'target_not_room_member'; end if;
  -- 방장 자신을 지정한 경우도 여기로 접힌다 (방을 없애려면 '매칭 리스트에서 내리기')
  if v_m.role = 'host' then raise exception 'cannot_kick_host'; end if;
  -- 멱등 — 목록이 낡아 두 번 눌러도, 두 창에서 동시에 눌러도 무해해야 한다
  if v_m.status = 'removed' then return; end if;

  -- 0070: 이 방의 경기에 이미 배정된 사람은 내보낼 수 없다.
  -- 확정 여부를 가리지 않는다 — 확정된 경기의 상대도 그 방의 기록에 남아 있는 사람이고,
  -- 미확정이면 그의 확인 없이는 결과가 확정될 수 없기 때문이다(좌석 만장일치, 0060).
  if exists (
    select 1 from personal_matches pm
    where pm.room_id = p_room_id
      and (pm.user_id = p_target_user_id or exists (
        select 1 from personal_match_participants p
        where p.match_id = pm.id and p.user_id = p_target_user_id
      ))
  ) or exists (
    select 1 from match_requests r
    where r.room_id = p_room_id
      and (r.requester_id = p_target_user_id or r.opponent_user_id = p_target_user_id or exists (
        select 1 from match_request_participants p
        where p.request_id = r.id and p.user_id = p_target_user_id
      ))
  ) then
    raise exception 'member_has_games';
  end if;

  update match_room_members
  set status = 'removed', responded_at = now()
  where id = v_m.id;

  -- 미확정 로테이션 방이면 선수 풀에서도 뺀다. players를 갱신하면 트리거
  -- sync_rotation_session_participants(0057)가 좌석을 알아서 정리한다(rejected는 보존).
  select * into v_s from rotation_sessions where room_id = p_room_id for update;
  if found then
    update rotation_sessions
    set players = coalesce((
      select jsonb_agg(e)
      from jsonb_array_elements(v_s.players) e
      where e->>'userId' is distinct from p_target_user_id::text
    ), '[]'::jsonb)
    where id = v_s.id;
  end if;
end;
$$;

revoke all on function public.kick_room_member(uuid, uuid) from public;
revoke execute on function public.kick_room_member(uuid, uuid) from anon;
grant execute on function public.kick_room_member(uuid, uuid) to authenticated;

comment on function public.kick_room_member(uuid, uuid) is
  '방장이 참가자를 내보낸다 — 배정된 경기가 없는 사람만(0070). 해제는 방장의 재초대뿐(0068 §5).';


-- ════════════════════════════════════════════════════════════════
-- §2 get_match_room_detail — removed를 declined와 같이 막는다 (0069 §4 대체)
-- ════════════════════════════════════════════════════════════════
--- 0069판 본문 그대로이고 게이트 한 줄만 바뀐다. §1이 "배정된 사람은 내보내지 못한다"를
--- 보장하므로, 여기서 막아도 확인하지 못한 채 잘리는 좌석은 생기지 않는다.
create or replace function public.get_match_room_detail(p_room_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room match_rooms%rowtype;
  v_host users%rowtype;
  v_viewer match_room_members%rowtype;
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_s rotation_sessions%rowtype;
  v_source jsonb;
  v_members jsonb;
  v_guests jsonb;
  v_games jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_room from match_rooms where id = p_room_id;
  if not found then raise exception 'room_not_found'; end if;
  select * into v_viewer from match_room_members where room_id = p_room_id and user_id = v_uid;
  -- 0070: 내보낸 사람도 나간 사람과 같이 막는다 — 강퇴는 '차단'이지 '읽기 전용 참관'이 아니다
  if v_room.host_user_id <> v_uid and (not found or v_viewer.status in ('declined', 'removed')) then
    raise exception 'not_member';
  end if;
  select * into v_host from users where id = v_room.host_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', m.user_id, 'name', u.name, 'nickname', u.nickname, 'profileImage', u.profile_image,
      'deleted', u.deleted_at is not null, 'role', m.role, 'status', m.status, 'sourceRole', m.source_role,
      -- Week 41: 명단에 노출할 프로필 메타. 게스트는 users 행이 없어 여기 오지 않는다
      'ntrp', public.derive_public_ntrp(u),
      'hand', u.dominant_hand,
      'racketBrand', u.racket_brand,
      'racketModel', u.racket_model
    ) order by (m.role = 'host') desc, (m.status = 'joined') desc, m.created_at), '[]'::jsonb)
  into v_members
  from match_room_members m join users u on u.id = m.user_id
  where m.room_id = p_room_id;

  -- 0069: 방에 등록된 비회원. 회원 멤버와 나란히 '방에 있는 사람'을 이룬다
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'hand', g.dominant_hand, 'ntrp', g.ntrp,
      'gender', g.gender, 'createdBy', g.created_by
    ) order by g.created_at), '[]'::jsonb)
  into v_guests
  from match_room_guests g where g.room_id = p_room_id;

  if v_room.source_kind = 'confirmation' then
    -- 방 게임이 쌓이면 요청이 여러 건이므로 방을 만든 최초 요청을 출처로 고정한다
    select * into v_req from match_requests where room_id = p_room_id order by created_at limit 1;
    if found then
      select * into v_neg from match_result_negotiations where request_id = v_req.id;
      v_source := jsonb_build_object(
        'kind', 'confirmation',
        'requestStatus', v_req.status,
        'resultStatus', coalesce(v_neg.result_status, 'none'),
        'repName', (select u.name from users u where u.id = v_req.opponent_user_id),
        'repUserId', v_req.opponent_user_id,
        'participants', (
          select coalesce(jsonb_agg(jsonb_build_object('role', p.role, 'name', p.name, 'userId', p.user_id) order by p.role), '[]'::jsonb)
          from match_request_participants p where p.request_id = v_req.id
        )
      );
    else
      v_source := jsonb_build_object('kind', 'confirmation');
    end if;
  elsif v_room.source_kind = 'rotation' then
    select * into v_s from rotation_sessions where room_id = p_room_id;
    v_source := jsonb_build_object(
      'kind', 'rotation',
      'isFinalized', not found,
      'sessionId', case when found then v_s.id else null end,
      'ownerUserId', case when found then v_s.user_id else null end,
      'pool', case when found then v_s.players else null end
    );
  else
    v_source := jsonb_build_object('kind', 'direct');
  end if;

  -- primary 게임 = 관점 복사본이 아닌 행 한 벌 (작성자가 방장이 아니어도 방 전원에게 보인다)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pm.id, 'groupSeq', pm.group_seq, 'matchType', pm.match_type, 'setScores', pm.set_scores,
      'ownerUserId', pm.user_id, 'ownerName', ou.name,
      'sourceType', pm.source_type, 'sourceRequestId', pm.source_request_id,
      'resultStatus', neg.result_status,
      'participants', (
        select coalesce(jsonb_agg(jsonb_build_object('role', p.role, 'name', p.name, 'userId', p.user_id) order by p.role), '[]'::jsonb)
        from personal_match_participants p where p.match_id = pm.id
      )
    ) order by pm.group_seq nulls first, pm.created_at), '[]'::jsonb)
  into v_games
  from personal_matches pm
  join users ou on ou.id = pm.user_id
  left join match_result_negotiations neg on neg.request_id = pm.source_request_id
  where pm.room_id = p_room_id and not pm.is_perspective;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'id', v_room.id, 'hostUserId', v_room.host_user_id, 'sourceKind', v_room.source_kind,
      'playedAt', v_room.played_at, 'playedTime', v_room.played_time, 'matchType', v_room.match_type,
      'surface', v_room.surface, 'courtName', v_room.court_name, 'notes', v_room.notes,
      'isSettled', v_room.is_settled, 'createdAt', v_room.created_at
    ),
    'host', jsonb_build_object(
      'id', v_host.id, 'name', v_host.name, 'nickname', v_host.nickname,
      'profileImage', v_host.profile_image, 'deleted', v_host.deleted_at is not null
    ),
    'viewer', case when v_viewer.id is null then null
      else jsonb_build_object('role', v_viewer.role, 'status', v_viewer.status) end,
    'members', v_members,
    'guests', v_guests,
    'source', v_source,
    'games', v_games
  );
end;
$$;

revoke all on function public.get_match_room_detail(uuid) from public;
revoke execute on function public.get_match_room_detail(uuid) from anon;
grant execute on function public.get_match_room_detail(uuid) to authenticated;
