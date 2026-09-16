-- 0089: 룸 게임 참가자의 탈퇴 표시 + 내려진 방의 빈 세션 정리 (F-25 · F-26, Week 63)
--
-- F-25 — 탈퇴한 상대의 이름이 화면마다 달랐다: 룸 명단·소유자는 users 현재값(`탈퇴한 회원`), 개인 카드와
--   룸 게임 참가자는 스냅샷(원래 이름). 규칙을 정했다 — **스냅샷이 있는 자리는 원래 이름 + 탈퇴 배지,
--   없는 자리는 `탈퇴한 회원` + 배지**. 그러려면 게임 참가자에 `deleted`가 실려야 한다.
--   `get_match_room_detail`은 **0083 본문을 그대로 옮겨 적고** participants에 `deleted`만 더했다
--   (0075·0078의 함정 — 옛 정의를 복사하면 지운 가드가 되살아난다. 0083 뒤로 이 함수를 고친 마이그레이션은 없다).
--
-- F-26 — 호스트가 [매칭 리스트에서 내리기]로 지운 로테이션 방(게임 0)의 세션이 `room_id null`로 풀려
--   참가자의 「결과 입력 대기」에 방 밖 세션 카드로 남았다. 출처 행을 `on delete set null`로 남기는 설계(0046)는
--   게임이 있는 기록을 지키기 위한 것이지 빈 세션을 남기려는 것이 아니다. before delete 트리거가 FK 동작보다
--   먼저 돌아 **게임이 하나도 없는 세션만** 지운다(참가자 행은 0057 cascade). 앱의 삭제 경로(호스트 직접 delete)와
--   cleanup 트리거 경로 어느 쪽도 이 트리거를 지난다.

-- 1) get_match_room_detail (0083 §6 본문 + participants.deleted)
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
  if v_room.host_user_id <> v_uid and (not found or v_viewer.status in ('declined', 'removed')) then
    raise exception 'not_member';
  end if;
  select * into v_host from users where id = v_room.host_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', m.user_id, 'name', u.name, 'nickname', u.nickname, 'profileImage', u.profile_image,
      'deleted', u.deleted_at is not null, 'role', m.role, 'status', m.status, 'sourceRole', m.source_role,
      'ntrp', public.derive_public_ntrp(u),
      'hand', u.dominant_hand,
      'racketBrand', u.racket_brand,
      'racketModel', u.racket_model
    ) order by (m.role = 'host') desc, (m.status = 'joined') desc, m.created_at), '[]'::jsonb)
  into v_members
  from match_room_members m join users u on u.id = m.user_id
  where m.room_id = p_room_id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'hand', g.dominant_hand, 'ntrp', g.ntrp,
      'gender', g.gender, 'createdBy', g.created_by
    ) order by g.created_at), '[]'::jsonb)
  into v_guests
  from match_room_guests g where g.room_id = p_room_id;

  if v_room.source_kind = 'confirmation' then
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

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', pm.id, 'groupSeq', pm.group_seq, 'matchType', pm.match_type, 'setScores', pm.set_scores,
      'ownerUserId', pm.user_id, 'ownerName', ou.name,
      'sourceType', pm.source_type, 'sourceRequestId', pm.source_request_id,
      'resultStatus', neg.result_status,
      'participants', (
        -- 스냅샷 이름은 그대로 두고 탈퇴 여부만 얹는다(0089, F-25) — 이름 옆에 '탈퇴' 배지를 그리기 위해
        select coalesce(jsonb_agg(jsonb_build_object(
          'role', p.role, 'name', p.name, 'userId', p.user_id,
          'deleted', pu.deleted_at is not null
        ) order by p.role), '[]'::jsonb)
        from personal_match_participants p left join users pu on pu.id = p.user_id
        where p.match_id = pm.id
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
      'durationMinutes', v_room.duration_minutes, 'courtCount', v_room.court_count,
      'slotMinutes', v_room.slot_minutes,
      'isListed', v_room.is_listed,
      'closedAt', v_room.closed_at,
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

-- 2) 내려지는 방의 빈 로테이션 세션 정리
create or replace function public.drop_empty_rotation_sessions_on_room_delete()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from rotation_sessions rs
  where rs.room_id = old.id
    and not exists (select 1 from personal_matches pm where pm.rotation_session_id = rs.id);
  return old;
end;
$$;

revoke all on function public.drop_empty_rotation_sessions_on_room_delete() from public, anon, authenticated;

drop trigger if exists match_rooms_drop_empty_sessions on public.match_rooms;
create trigger match_rooms_drop_empty_sessions
  before delete on public.match_rooms
  for each row execute function public.drop_empty_rotation_sessions_on_room_delete();
