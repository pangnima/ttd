-- 0087: `avatars` 스토리지 버킷 생성 (F-27, Week 63)
--
-- 정책 넷("Users can upload own avatar" 등)은 처음부터 있었는데 **버킷 자체가 없었다**.
-- 그래서 가입·온보딩·프로필 설정의 사진 업로드는 한 번도 성공한 적이 없다 — 적용 시점에
-- users.profile_image가 스토리지 URL인 행이 0건(55명 전원 기본 아바타, 구글 1명)이다.
-- 세 액션이 upload 에러를 삼키고 기본 아바타로 폴백했기 때문에 화면에는 드러나지 않았고,
-- Week 62 E2E는 그보다 앞선 서버 액션 본문 한계(F-15)에서 막혀 여기까지 오지 못했다.
--
-- 한계는 앱 상수(`lib/profile/avatar-limits.ts`)의 거울이다 — 필드가 브라우저에서 512px로 줄여
-- 보내고 액션이 1MB·MIME을 검사하지만, 최종 방어선은 버킷이 쥔다(클라·액션을 우회해도 여기서 막힌다).
-- 공개 읽기(SELECT 정책 + public=true)는 프로필 사진이 getPublicUrl로 쓰이기 때문이다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
