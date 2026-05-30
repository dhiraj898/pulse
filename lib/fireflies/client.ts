import { refreshFirefliesToken } from './oauth'
import { encrypt, decrypt } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const FIREFLIES_GRAPHQL_URL = 'https://api.fireflies.ai/graphql'

async function getValidFirefliesToken(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: user, error } = await admin
    .from('users')
    .select('fireflies_api_key_encrypted, fireflies_access_token_encrypted, fireflies_access_token_expires_at, fireflies_refresh_token_encrypted')
    .eq('id', userId)
    .single()

  if (error || !user) throw new Error('User not found')

  // Personal API key (long-lived Bearer) takes precedence over OAuth tokens.
  if (user.fireflies_api_key_encrypted) {
    return decrypt(user.fireflies_api_key_encrypted)
  }

  const expiresAt = user.fireflies_access_token_expires_at
    ? new Date(user.fireflies_access_token_expires_at)
    : null

  if (expiresAt && expiresAt > new Date(Date.now() + 60_000) && user.fireflies_access_token_encrypted) {
    return decrypt(user.fireflies_access_token_encrypted)
  }

  if (!user.fireflies_refresh_token_encrypted) {
    throw new Error('No Fireflies refresh token — reconnect Fireflies')
  }

  const refreshToken = await decrypt(user.fireflies_refresh_token_encrypted)
  const tokens = await refreshFirefliesToken(refreshToken)

  await admin.from('users').update({
    fireflies_access_token_encrypted: await encrypt(tokens.access_token),
    fireflies_access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq('id', userId)

  return tokens.access_token
}

async function gqlQuery<T>(userId: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getValidFirefliesToken(userId)
  const res = await fetch(FIREFLIES_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Fireflies GraphQL error: ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

export interface FirefliesTranscript {
  id: string
  title: string
  date: string
  duration: number
  organizer_email: string
  participants: string[]
  sentences: Array<{ speaker_name: string; text: string; raw_end_offset?: number }>
}

export async function listTranscripts(userId: string, limit = 10): Promise<{ id: string; title: string; date: string }[]> {
  const data = await gqlQuery<{ transcripts: { id: string; title: string; date: string }[] }>(
    userId,
    `query { transcripts(limit: ${limit}) { id title date } }`
  )
  return data.transcripts
}

export async function getTranscript(userId: string, transcriptId: string): Promise<FirefliesTranscript> {
  const data = await gqlQuery<{ transcript: FirefliesTranscript }>(
    userId,
    `query($id: String!) {
      transcript(id: $id) {
        id title date duration organizer_email participants
        sentences { speaker_name text raw_end_offset }
      }
    }`,
    { id: transcriptId }
  )
  return data.transcript
}
