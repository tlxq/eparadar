import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';
import { createClient } from '@supabase/supabase-js';

const REMOVE_BATCH = 500;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function passwordMatches(email: string, password: string): Promise<boolean> {
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const userId = ctx.userClaims!.id;
    const { password } = (await req.json().catch(() => ({}))) as { password?: string };
    if (!password) return json(400, { error: 'Skriv ditt lösenord.' });

    const admin = ctx.supabaseAdmin;
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userError || !email) return json(400, { error: 'Kontot hittades inte.' });

    if (!(await passwordMatches(email, password))) {
      return json(403, { error: 'Fel lösenord.' });
    }

    const { data: files, error: prepareError } = await admin.rpc('prepare_account_deletion', {
      p_user_id: userId,
    });
    if (prepareError) return json(500, { error: 'Kontot kunde inte raderas. Försök igen.' });

    const byBucket = new Map<string, string[]>();
    for (const file of (files ?? []) as { bucket: string; path: string }[]) {
      byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file.path]);
    }
    for (const [bucket, paths] of byBucket) {
      for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
        await admin.storage.from(bucket).remove(paths.slice(i, i + REMOVE_BATCH));
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) return json(500, { error: 'Kontot kunde inte raderas. Försök igen.' });

    return json(200, { deleted: true });
  }),
};
