import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  fetch: withSupabase({ auth: ['secret'] }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin;
    const { data, error } = await admin.rpc('take_storage_cleanup');
    if (error) return json(500, { error: error.message });

    const byBucket = new Map<string, string[]>();
    for (const file of (data ?? []) as { bucket: string; path: string }[]) {
      byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file.path]);
    }

    let removed = 0;
    for (const [bucket, paths] of byBucket) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        await admin.from('storage_cleanup').upsert(paths.map((path) => ({ bucket, path })));
        continue;
      }
      removed += paths.length;
    }

    return json(200, { removed });
  }),
};
