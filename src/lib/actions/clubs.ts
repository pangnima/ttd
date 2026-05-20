'use server'

// RLS 의존성:
//   - INSERT: owner_id = auth.uid() 로 강제 (RLS 정책)
//   - UPDATE/DELETE: clubs.owner_id = auth.uid() 인 row만 허용 (RLS 정책)
// is_public: true면 미가입 사용자도 클럽 검색/조회 가능, false면 approved 멤버만 조회

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

    if (!name) return { error: '클럽 이름을 입력해주세요.' }
    if (!region) return { error: '활동 지역을 입력해주세요.' }

    const { data, error } = await supabase
        .from('clubs')
        .insert({
            name,
            region,
            description: description || null,
            is_public: isPublic,
            owner_id: user.id,
        })
        .select('id')
        .single()

    if (error) return { error: error.message }

    const logo = formData.get('logo') as File | null
    if (logo && logo.size > 0) {
        const logoUrl = await uploadClubLogo(supabase, data.id, logo)
        if (logoUrl) {
            await supabase.from('clubs').update({ logo_url: logoUrl }).eq('id', data.id)
        }
    }

    revalidatePath('/clubs', 'layout')
    redirect(`/clubs/${data.id}`)
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
        is_public: isPublic,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
    }).eq('id', clubId)
    if (error) return { error: error.message }

    revalidatePath('/clubs', 'layout')
    redirect(`/clubs/${clubId}`)
}

export async function deleteClubAction(clubId: string): Promise<{ error: string } | null> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: '로그인이 필요합니다.' }

    const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', clubId)

    if (error) return { error: error.message }
    revalidatePath('/clubs', 'layout')
    redirect('/clubs')
}
