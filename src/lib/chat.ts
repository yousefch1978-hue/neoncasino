import { supabase } from './supabase'

export interface DbChatMessage {
  id: string
  room: 'global' | 'support'
  user_id: string
  username: string
  message: string
  is_admin: boolean
  is_support: boolean
  created_at: string
}

export async function sendChatMessage({
  room,
  userId,
  username,
  message,
  isAdmin = false,
  isSupport = false,
}: {
  room: 'global' | 'support'
  userId: string
  username: string
  message: string
  isAdmin?: boolean
  isSupport?: boolean
}) {
  const { error } = await supabase.from('chat_messages').insert({
    room,
    user_id: userId,
    username,
    message,
    is_admin: isAdmin,
    is_support: isSupport,
  })

  if (error) throw error
}

export async function getChatMessages(room: 'global' | 'support') {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room', room)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw error
  return (data || []) as DbChatMessage[]
}