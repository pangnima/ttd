-- 0055_reopen_match_result.sql
-- 확정된 상호 확인 경기의 결과를 다시 협상 상태로 되돌린다.
--
-- 문제: result_status='confirmed'가 종점이었다. propose_match_result는 result_already_confirmed로
--       막히고(0040:847), 확정된 personal_matches는 RESTRICTIVE 정책(source_type='confirmation')으로
--       소유자도 수정·삭제할 수 없다. 점수를 잘못 확정하면 되돌릴 방법이 코드에 없었다.
--
-- 설계: dispute_match_result와 같은 상태(disputed)로 되돌린다 — 새 상태축을 만들지 않는다.
--   · proposed_set_scores·proposed_by는 남긴다 → 재제안 다이얼로그가 직전 확정값을 프리필한다
--     (mutual-result-actions.tsx가 이미 disputed에서 그렇게 읽는다)
--   · source_request_id가 이 요청인 personal_matches를 전부(요청자·대표·복식 파트너·상대2)
--     set_scores='[]'로 되돌린다 → 생성 컬럼 has_result가 false가 되어 개인 경기 결과에서 사라지고
--     확인 요청 허브로 돌아온다(집합 분할 불변식이 화면 이동을 알아서 처리한다)
--   · personal_matches UPDATE 트리거(0049)가 recompute_match_room_settled를 깨워
--     방이 '종료된 경기'에서 '진행 중'으로 되돌아온다
--
-- 권한: 제안·확인·이의와 동일하게 요청 당사자 2명(requester/opponent)만. 한쪽이 되돌리면 즉시
--       재협상 상태가 되고, 상대는 허브에서 그 사실과 사유를 본다. 양측 합의 절차를 두면 상태축이
--       하나 더 늘어나는데, 잘못된 기록을 고치는 일에 상대 동의를 요구하면 되돌리기가 다시 막힌다.

create or replace function public.reopen_match_result(p_request_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req match_requests%rowtype;
  v_neg match_result_negotiations%rowtype;
  v_uid uuid := auth.uid();
  v_counterpart_id uuid;
  v_counterpart_deleted timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rows int;
begin
  select * into v_req from match_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'accepted' then raise exception 'request_not_accepted'; end if;
  if v_uid is null or (v_req.requester_id <> v_uid and v_req.opponent_user_id <> v_uid) then
    raise exception 'not_request_party';
  end if;

  select * into v_neg from match_result_negotiations where request_id = p_request_id for update;
  if not found or v_neg.result_status <> 'confirmed' then raise exception 'result_not_confirmed'; end if;
  if v_reason is not null and char_length(v_reason) > 200 then raise exception 'dispute_reason_too_long'; end if;

  -- 상대가 탈퇴했으면 재협상 상대가 없다 — 되돌리면 영영 미확정으로 남는다(propose의 같은 가드와 대칭)
  v_counterpart_id := case when v_req.requester_id = v_uid then v_req.opponent_user_id else v_req.requester_id end;
  select deleted_at into v_counterpart_deleted from users where id = v_counterpart_id;
  if v_counterpart_deleted is not null then raise exception 'counterpart_deleted'; end if;

  -- 이 요청에서 파생된 관점 행 전부를 미확정으로 되돌린다(요청자·대표·복식 파트너·상대2)
  update personal_matches
  set set_scores = '[]'::jsonb
  where source_request_id = p_request_id;
  get diagnostics v_rows = row_count;
  if v_rows < 2 then raise exception 'personal_matches_missing'; end if;

  update match_result_negotiations
  set result_status = 'disputed',
      set_scores = '[]'::jsonb,
      dispute_reason = coalesce(v_reason, '결과 정정 요청')
  where request_id = p_request_id;
end;
$$;

revoke all on function public.reopen_match_result(uuid, text) from public;
revoke execute on function public.reopen_match_result(uuid, text) from anon;
grant execute on function public.reopen_match_result(uuid, text) to authenticated;
