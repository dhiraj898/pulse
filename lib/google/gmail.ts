import { createAdminClient } from '@/lib/supabase/admin';
import { getGoogleAccessToken } from './calendar';

const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

interface GmailHeader { name: string; value: string }

function header(headers: GmailHeader[], name: string): string | undefined {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
}

// "Jane Doe <jane@x.com>" -> { name: 'Jane Doe', email: 'jane@x.com' }
function parseFrom(raw?: string): { name: string | null; email: string } {
  if (!raw) return { name: null, email: 'unknown' };
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, '').trim() || null, email: match[2].trim() };
  return { name: null, email: raw.trim() };
}

// Pull recent inbox messages into the emails table. Returns count synced.
export async function syncEmails(userId: string, max = 25): Promise<number> {
  const accessToken = await getGoogleAccessToken(userId);
  const auth = { Authorization: `Bearer ${accessToken}` };

  const listRes = await fetch(
    `${GMAIL_API}/messages?` +
      new URLSearchParams({ maxResults: String(max), q: 'in:inbox newer_than:7d' }),
    { headers: auth },
  );
  if (!listRes.ok) {
    throw new Error(`Gmail API error: ${listRes.status} ${await listRes.text()}`);
  }
  const list = (await listRes.json()) as { messages?: { id: string; threadId: string }[] };
  const messages = list.messages ?? [];
  if (messages.length === 0) return 0;

  const rows = await Promise.all(
    messages.map(async ({ id }) => {
      const res = await fetch(
        `${GMAIL_API}/messages/${id}?` +
          new URLSearchParams({
            format: 'metadata',
            metadataHeaders: 'From',
          }) +
          '&metadataHeaders=Subject&metadataHeaders=Date',
        { headers: auth },
      );
      if (!res.ok) return null;
      const msg = (await res.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: GmailHeader[] };
      };
      const headers = msg.payload?.headers ?? [];
      const from = parseFrom(header(headers, 'From'));
      const receivedAt = msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString();

      return {
        user_id: userId,
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId,
        from_email: from.email,
        from_name: from.name,
        subject: header(headers, 'Subject') ?? null,
        snippet: msg.snippet ?? null,
        received_at: receivedAt,
        priority: null,
        priority_reason: null,
        awaiting_reply: false,
        commitment_due_at: null,
        replied_at: null,
        classified_at: null,
      };
    }),
  );

  const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return 0;

  const admin = createAdminClient();
  const { error } = await admin
    .from('emails')
    .upsert(valid, { onConflict: 'user_id,gmail_message_id' });
  if (error) throw new Error(`Failed to save emails: ${error.message}`);
  return valid.length;
}
