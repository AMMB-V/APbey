import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('INVITATION_FROM_EMAIL');
  const appUrl = Deno.env.get('APP_URL');

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey || !fromEmail || !appUrl) {
    return json({ error: 'email_service_not_configured' }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'authentication_required' }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();
  if (profileError || profile?.role !== 'admin') return json({ error: 'admin_required' }, 403);

  const payload = await request.json().catch(() => null);
  const id = typeof payload?.id === 'string' ? payload.id : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
  if (!id || !email || !code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_payload' }, 400);
  }

  const inviteUrl = `${appUrl.replace(/\/$/, '')}?invite=${encodeURIComponent(code)}`;
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: ['Bearer', resendApiKey].join(' '),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Invitación a Beyblade X Arena',
      text: `Has sido invitado a Beyblade X Arena.\n\nCódigo de invitación: ${code}\nEnlace de registro: ${inviteUrl}\n\nUsa el mismo correo al registrarte.`,
      html: `<p>Has sido invitado a <strong>Beyblade X Arena</strong>.</p><p><strong>Código:</strong> ${escapeHtml(code)}</p><p><a href="${escapeHtml(inviteUrl)}">Completar registro</a></p><p>Usa el mismo correo al registrarte.</p>`,
    }),
  });
  const resendBody = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    await adminClient.from('invitations').update({
      email_status: 'failed',
      email_error: typeof resendBody?.message === 'string' ? resendBody.message : 'resend_request_failed',
    }).eq('id', id);
    return json({ error: 'email_delivery_failed' }, 502);
  }

  const messageId = typeof resendBody?.id === 'string' ? resendBody.id : null;
  await adminClient.from('invitations').update({
    email_status: 'sent',
    email_message_id: messageId,
    email_error: null,
    email_sent_at: new Date().toISOString(),
  }).eq('id', id);

  return json({ sent: true, messageId });
});
