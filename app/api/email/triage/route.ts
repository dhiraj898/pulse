import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  classifyTask,
  checkBudgetAvailable,
  recordAiCall,
  estimateTokens,
} from '@/lib/sarvam';

const CONFIDENCE_THRESHOLD = 0.5;
const TRIAGE_MODEL = process.env.SARVAM_MODEL_CLASSIFY ?? 'sarvam-m';

// Runs AI classification over not-yet-triaged emails, creates tasks for the
// confident ones, and marks each email classified. Best-effort: a failure on
// one email doesn't abort the batch.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createAdminClient();
    const budget = await checkBudgetAvailable(user.id, 1, db);
    if (!budget.available) {
      return NextResponse.json({ error: 'AI budget exceeded for this month' }, { status: 429 });
    }

    const { data: emails } = await supabase
      .from('emails')
      .select('id, subject, snippet')
      .eq('user_id', user.id)
      .is('classified_at', null)
      .order('received_at', { ascending: false })
      .limit(10);

    if (!emails || emails.length === 0) {
      return NextResponse.json({ triaged: 0, tasksCreated: 0 });
    }

    let tasksCreated = 0;
    for (const email of emails) {
      const subject = email.subject ?? '';
      const body = email.snippet ?? '';
      try {
        const result = await classifyTask(subject, body, user.id);
        await recordAiCall(
          user.id,
          'email_triage',
          TRIAGE_MODEL,
          estimateTokens(subject + body),
          estimateTokens(JSON.stringify(result)),
          db,
        );

        if (result.confidence >= CONFIDENCE_THRESHOLD) {
          await supabase.from('tasks').insert([
            {
              user_id: user.id,
              title: result.title,
              description: result.description ?? null,
              source: 'email',
              source_ref_id: email.id,
              status: 'proposed',
              effort: result.effort ?? null,
              due_at: result.dueDate ?? null,
              evidence_quote: body || null,
              confidence: result.confidence,
              client_id: null,
              parent_recurring_id: null,
              recurrence_rule: null,
              completed_at: null,
            },
          ]);
          tasksCreated++;
        }
      } catch (err) {
        console.error(`Triage failed for email ${email.id}:`, err);
      } finally {
        await supabase
          .from('emails')
          .update({ classified_at: new Date().toISOString() })
          .eq('id', email.id);
      }
    }

    return NextResponse.json({ triaged: emails.length, tasksCreated });
  } catch (error) {
    console.error('Triage error:', error);
    return NextResponse.json({ error: 'Triage failed' }, { status: 500 });
  }
}
