import { describe, it, expect, beforeAll } from 'vitest'

// Set env before imports
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('crypto', () => {
  it('round-trips encrypt/decrypt', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const original = 'super-secret-token-12345'
    const ciphertext = await encrypt(original)
    expect(ciphertext).not.toBe(original)
    const decrypted = await decrypt(ciphertext)
    expect(decrypted).toBe(original)
  })

  it('produces different ciphertext each call', async () => {
    const { encrypt } = await import('@/lib/crypto')
    const a = await encrypt('same-value')
    const b = await encrypt('same-value')
    expect(a).not.toBe(b)
  })

  it('throws with invalid key', async () => {
    process.env.ENCRYPTION_KEY = 'tooshort'
    const { encrypt } = await import('@/lib/crypto')
    await expect(encrypt('test')).rejects.toThrow('ENCRYPTION_KEY')
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
  })
})
