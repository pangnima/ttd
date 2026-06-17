'use server'

// RLS 의존성:
//   - INSERT: owner_id = auth.uid() 로 강제 (RLS 정책)
//   - UPDATE/DELETE: clubs.owner_id = auth.uid() 인 row만 허용 (RLS 정책)
// is_public: true면 미가입 사용자도 클럽 검색/조회 가능, false면 approved 멤버만 조회

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomClubLogoPath } from '@/lib/default-images'
import { hashClubPassword, verifyClubPassword } from '@/lib/club-password'

async function uploadClubLogo(
    supabase: Awaited<ReturnType<typeof createClient>>,
    clubId: string,
    file: File
): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${clubId}/logo.${ext}`
    const { error } = await supabase.storage.from('club-logos').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('club-logos').getPublicUrl(path)
    return data.publicUrl
}

export async function createClubAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const name = (formData.get('name') as string).trim()
    const region = (formData.get('region') as string).trim()
    const description = (formData.get('description') as string | null)?.trim() ?? ''
    const isPublic = formData.get('is_public') !== 'false'
    const deletePassword = (formData.get('delete_password') as string | null) ?? ''
    const deletePasswordConfirm = (formData.get('delete_password_confirm') as string | null) ?? ''

    if (!name) return { error: '클럽 이름을 입력해주세요.' }
    if (!region) return { error: '활동 지역을 입력해주세요.' }
    if (deletePassword.length < 4) return { error: '삭제 비밀번호는 4자 이상이어야 합니다.' }
    if (deletePassword !== deletePasswordConfirm) return { error: '삭제 비밀번호가 일치하지 않습니다.' }

    // id를 미리 생성해 INSERT에 포함한다. .select() 없이 INSERT하면 RETURNING이 발생하지 않아
    // SELECT 정책 검사를 타지 않으므로 비공개 클럽 생성 시 RLS 거부를 원천 차단한다.
    const id = crypto.randomUUID()
    const { error } = await supabase
        .from('clubs')
        .insert({
            id,
            name,
            region,
            description: description || null,
            is_public: isPublic,
            owner_id: user.id,
            delete_password_hash: hashClubPassword(deletePassword),
        })

    if (error) return { error: error.message }

    // 로고 — 업로드가 있으면 업로드본, 없으면 선택된 기본 로고, 그것도 없으면 랜덤 배정
    const logo = formData.get('logo') as File | null
    const defaultLogo = (formData.get('default_logo') as string | null)?.trim() || ''
    let logoUrl: string | null = null
    if (logo && logo.size > 0) {
        logoUrl = await uploadClubLogo(supabase, id, logo)
    }
    if (!logoUrl) logoUrl = defaultLogo || randomClubLogoPath()
    await supabase.from('clubs').update({ logo_url: logoUrl }).eq('id', id)

    revalidatePath('/clubs', 'layout')
    redirect(`/clubs/${id}`)
}

export async function updateClubAction(
    _prevState: { error: string } | null,
    formData: FormData
): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const clubId = formData.get('club_id') as string
    const name = (formData.get('name') as string).trim()
    const region = (formData.get('region') as string | null)?.trim() ?? ''
    const description = (formData.get('description') as string | null)?.trim() ?? ''
    const courtSchedule = (formData.get('court_schedule') as string | null)?.trim() ?? ''
    const isPublic = formData.get('is_public') !== 'false'

    if (!name) return { error: '클럽 이름을 입력해주세요.' }

    let logoUrl: string | undefined
    const logo = formData.get('logo') as File | null
    if (logo && logo.size > 0) {
        logoUrl = await uploadClubLogo(supabase, clubId, logo) ?? undefined
    }

    const { error } = await supabase.from('clubs').update({
        name,
        region: region || null,
        description: description || null,
        court_schedule: courtSchedule || null,
        is_public: isPublic,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
    }).eq('id', clubId)
    if (error) return { error: error.message }

    revalidatePath('/clubs', 'layout')
    redirect(`/clubs/${clubId}`)
}

export async function deleteClubAction(clubId: string, password?: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    // 삭제 비밀번호가 설정된 클럽이면 검증 (기존 클럽은 NULL → 검증 생략)
    const { data: club } = await supabase
        .from('clubs')
        .select('delete_password_hash')
        .eq('id', clubId)
        .single()
    if (club?.delete_password_hash) {
        if (!password || !verifyClubPassword(password, club.delete_password_hash)) {
            return { error: '비밀번호가 일치하지 않습니다.' }
        }
    }

    const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId)

    if (error) return { error: error.message }
    revalidatePath('/clubs', 'layout')
    redirect('/clubs')
}
