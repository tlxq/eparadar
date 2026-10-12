import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

const MODERATION_ADDRESS = 'contact@eparadar.se';

const REASONS: Record<string, string> = {
  hat: 'Hat eller kränkningar',
  sexuellt: 'Sexuellt innehåll',
  hot: 'Hot eller våld',
  mobbning: 'Mobbning',
  spam: 'Spam eller bedrägeri',
  farligt: 'Farligt beteende',
  under15: 'Verkar vara under 15 år',
  annat: 'Annat',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default {
  fetch: withSupabase({ auth: ['secret'] }, async (req, ctx) => {
    const { report_id: reportId } = (await req.json().catch(() => ({}))) as { report_id?: string };
    if (!reportId) return json(400, { error: 'report_id saknas' });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json(200, { skipped: 'RESEND_API_KEY saknas' });

    const admin = ctx.supabaseAdmin;
    const { data: report, error } = await admin
      .from('reports')
      .select(
        'id, target_type, target_id, reason, details, snapshot, created_at, reporter:profiles!reports_reporter_id_fkey(username), reported:profiles!reports_reported_user_id_fkey(id, username)',
      )
      .eq('id', reportId)
      .single();
    if (error || !report) return json(404, { error: 'Rapporten hittades inte' });

    const reporter = (report.reporter as { username?: string } | null)?.username ?? 'okänd';
    const reported = report.reported as { id?: string; username?: string } | null;
    const rows: [string, string][] = [
      ['Anledning', REASONS[report.reason] ?? report.reason],
      ['Typ', `${report.target_type} ${report.target_id}`],
      ['Rapporterad', `@${reported?.username ?? 'okänd'} (${reported?.id ?? '-'})`],
      ['Av', `@${reporter}`],
      ['Innehåll', report.snapshot ?? ''],
      ['Kommentar', report.details ?? ''],
      ['Tid', report.created_at],
    ];
    const html = `<table>${rows
      .map(([key, value]) => `<tr><th align="left">${key}</th><td>${escapeHtml(value)}</td></tr>`)
      .join('')}</table>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `epaRadar <${MODERATION_ADDRESS}>`,
        to: [MODERATION_ADDRESS],
        subject: `Rapport: ${REASONS[report.reason] ?? report.reason} (${report.target_type})`,
        html,
      }),
    });
    if (!response.ok) return json(502, { error: 'E-post kunde inte skickas' });

    return json(200, { sent: true });
  }),
};
