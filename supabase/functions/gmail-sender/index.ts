import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Use nodemailer via npm specifier (Deno v1.28+)
import nodemailer from 'npm:nodemailer@6.9.13'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- HTML EMAIL TEMPLATE ---
function buildEmailHtml(titulo: string, cuerpo: string, recipientName?: string): string {
  const greeting = recipientName ? `Hola, ${recipientName.split(' ')[0]}` : 'Hola, equipo';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141414;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
          
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#001a0f 0%,#00331a 100%);padding:28px 32px;text-align:center;">
              <img src="https://appmotoe.web.app/logo.png" alt="MOTO-E" height="52" style="display:inline-block;margin-bottom:12px;" onerror="this.style.display='none'"/>
              <h1 style="margin:0;color:#00cc88;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
                MOTO-E COMUNICADOS
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px 0;color:rgba(255,255,255,0.5);font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                Nuevo comunicado
              </p>
              <h2 style="margin:0 0 20px 0;color:#00cc88;font-size:24px;font-weight:800;line-height:1.3;">
                ${titulo}
              </h2>
              <div style="width:40px;height:3px;background-color:#00cc88;border-radius:2px;margin-bottom:24px;"></div>
              <p style="margin:0 0 24px 0;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.7;white-space:pre-line;">
                ${cuerpo}
              </p>
              <div style="text-align:center;margin-top:36px;">
                <a href="https://appmotoe.web.app/"
                   style="display:inline-block;background-color:#00cc88;color:#000000;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:900;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
                  Abrir Aplicación →
                </a>
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0d0d0d;border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;line-height:1.6;">
                Este es un mensaje automático de la <strong style="color:rgba(255,255,255,0.5);">App de Gestión MOTO-E</strong>.<br/>
                Por favor, no respondas directamente a este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const gmailUser = Deno.env.get('SMTP_USER') || ''
  const gmailPass = Deno.env.get('SMTP_PASS') || ''

  if (!gmailUser || !gmailPass) {
    return new Response(
      JSON.stringify({ error: 'SMTP credentials not configured. Set SMTP_USER and SMTP_PASS secrets in Supabase.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Supabase client with service role (bypasses RLS for reading emails)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Parse body: { title, body, target_scope, target_value }
    const { title, body: msgBody, target_scope, target_value } = await req.json()

    if (!title || !msgBody) {
      return new Response(
        JSON.stringify({ error: 'title and body are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Build query to fetch target emails ---
    let query = supabase
      .from('profiles')
      .select('email, full_name')
      .eq('status', 'active')
      .not('email', 'is', null)

    if (target_scope === 'branch' && target_value) {
      query = query.eq('branch', target_value)
    } else if (target_scope === 'subteam' && target_value) {
      query = query.eq('subteam', target_value)
    }
    // else: global → no extra filter

    const { data: profiles, error: profilesErr } = await query

    if (profilesErr) throw profilesErr

    const recipientEmails = profiles
      ?.map((p: any) => p.email)
      .filter(Boolean) as string[]

    if (!recipientEmails || recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ status: 'no_recipients', message: 'No active users with email found for the given scope.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Configure Nodemailer (Gmail SMTP) ---
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // TLS
      auth: {
        user: gmailUser,
        pass: gmailPass, // Must be a Gmail App Password (not regular password)
      },
    })

    // --- Send email: TO = epsamotoe@gmail.com, BCC = all recipients ---
    const info = await transporter.sendMail({
      from: `"MOTO-E Comunicados" <${gmailUser}>`,
      to: gmailUser, // Sender is also 'to' for privacy
      bcc: recipientEmails, // Hidden recipients
      subject: `[MOTO-E] ${title}`,
      html: buildEmailHtml(title, msgBody),
    })

    // Log to edge_logs
    await supabase.from('edge_logs').insert({
      message: `Email enviado a ${recipientEmails.length} destinatario(s)`,
      details: {
        messageId: info.messageId,
        scope: target_scope,
        value: target_value,
        count: recipientEmails.length,
      },
    })

    return new Response(
      JSON.stringify({
        status: 'success',
        messageId: info.messageId,
        sentTo: recipientEmails.length,
        scope: target_scope,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('gmail-sender error:', err)

    // Try to log the error
    try {
      const supabase2 = createClient(supabaseUrl, supabaseServiceKey)
      await supabase2.from('edge_logs').insert({
        message: `gmail-sender ERROR: ${err?.message ?? err}`,
        details: JSON.stringify(err),
      })
    } catch (_) { /* ignore logging errors */ }

    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
