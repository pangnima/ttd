'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
    const description = (formData.get('description') as string | null)?.trim() ?? ''
    const isPublic = formData.get('is_public') !== 'false'

    if (!name) return { error: '클럽 이름을 입력해주세요.' }

    const { error } = await supabase
        .from('clubs')
        .update({ name, description: description || null, is_public: isPublic })
        .eq('id', clubId)

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
