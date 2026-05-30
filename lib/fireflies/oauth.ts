// Fireflies OAuth 2.0 — verify exact scope names and endpoint from Fireflies docs at integration time
const FIREFLIES_AUTH_URL = 'https://app.fireflies.ai/oauth/authorize'
const FIREFLIES_TOKEN_URL = 'https://api.fireflies.ai/oauth/token'

export const FIREFLIES_SCOPES = [
  'read:transcripts',
  'read:transcript_content',
  'webhooks',
].join(' ')

export function getFirefliesAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FIREFLIES_CLIENT_ID!,
    redirect_uri: process.env.FIREFLIES_REDIRECT_URI!,
    response_type: 'code',
    scope: FIREFLIES_SCOPES,
    state,
  })
  return `${FIREFLIES_AUTH_URL}?${params}`
}

export async function exchangeFirefliesCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const res = await fetch(FIREFLIES_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.FIREFLIES_CLIENT_ID!,
      client_secret: process.env.FIREFLIES_CLIENT_SECRET!,
      redirect_uri: process.env.FIREFLIES_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fireflies token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshFirefliesToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch(FIREFLIES_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.FIREFLIES_CLIENT_ID!,
      client_secret: process.env.FIREFLIES_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Fireflies token refresh failed: ${err}`)
  }
  return res.json()
}
