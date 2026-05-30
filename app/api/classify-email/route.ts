import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkBudgetAvailable, recordAiCall, classifyTask } from '@/lib/sarvam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasBudget = await checkBudgetAvailable(user.id);
    if (!hasBudget) {
      return NextResponse.json({ error: 'Budget exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const classification = await classifyTask(user.id, body);

    await recordAiCall(user.id, 'email_classification', body.tokens || 0, 0);

    return NextResponse.json(classification);
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 });
  }
}
