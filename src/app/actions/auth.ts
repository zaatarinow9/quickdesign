'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginAdmin(formData: FormData): Promise<void> {
  const username = formData.get('username')
  const password = formData.get('password')

  if (username === 'admin' && password === 'admin123') {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', { secure: true, httpOnly: true })
    redirect('/admin')
  }

  redirect('/admin/login?error=1')
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  redirect('/admin/login')
}