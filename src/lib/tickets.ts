import { supabase } from './supabase'

export interface SupportTicket {
  id: string
  user_id: string
  username: string
  subject: string
  category: string
  status: 'open' | 'pending' | 'closed'
  created_at: string
  updated_at: string
}

export interface SupportTicketMessage {
  id: string
  ticket_id: string
  user_id: string
  username: string
  message: string
  is_admin: boolean
  created_at: string
}

export async function getSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []) as SupportTicket[]
}

export async function createSupportTicket({
  userId,
  username,
  subject,
  category,
  message,
}: {
  userId: string
  username: string
  subject: string
  category: string
  message: string
}) {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      username,
      subject,
      category,
      status: 'open',
    })
    .select('*')
    .single()

  if (ticketError) throw ticketError

  const { error: messageError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticket.id,
      user_id: userId,
      username,
      message,
      is_admin: false,
    })

  if (messageError) throw messageError

  return ticket as SupportTicket
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as SupportTicketMessage[]
}

export async function sendTicketMessage({
  ticketId,
  userId,
  username,
  message,
  isAdmin = false,
}: {
  ticketId: string
  userId: string
  username: string
  message: string
  isAdmin?: boolean
}) {
  const { error } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      username,
      message,
      is_admin: isAdmin,
    })

  if (error) throw error

  const nextStatus = isAdmin ? 'pending' : 'open'

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      updated_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq('id', ticketId)

  if (updateError) throw updateError
}

export async function updateTicketStatus(ticketId: string, status: 'open' | 'pending' | 'closed') {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)

  if (error) throw error
}
