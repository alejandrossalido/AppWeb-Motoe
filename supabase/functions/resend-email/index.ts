import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Servicio de correos Resend iniciado.');

serve(async (req) => {
    let supabaseGlobal: any = null;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    supabaseGlobal = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const payload = await req.json();

        await supabaseGlobal.from('edge_logs').insert({
            message: 'Webhook recibido',
            details: payload
        });

        const record = payload?.record;

        if (!record || !record.user_id) {
            return new Response("OK - No record", { status: 200 }); // Ignore gracefully
        }

        // Obtener detalles del usuario para sacar su email
        const { data: profile, error: pErr } = await supabaseGlobal
            .from('profiles')
            .select('full_name, email')
            .eq('id', record.user_id)
            .single();

        if (pErr) console.error("Error fetching profile:", pErr);

        if (!profile || !profile.email) {
            return new Response("OK - No email", { status: 200 });
        }

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
            throw new Error('Secret RESEND_API_KEY no encontrado.');
        }

        const titulo = record.title || 'Nueva Notificación';
        const cuerpo = record.body || 'Entra en la aplicación para ver más detalles.';

        // Enviar a Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'MOTO-E Notificaciones <onboarding@resend.dev>',
                to: [profile.email],
                subject: titulo,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px; background-color: #fff;">
            <div style="background-color: #141414; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: #ff6600; font-size: 20px; margin: 0;">MOTO-E COMUNICADOS</h1>
            </div>
            <div style="padding: 24px; background-color: #FAFAFA; border-radius: 0 0 8px 8px;">
              <h2 style="color: #333; margin-top: 0;">Hola, ${profile.full_name?.split(' ')[0] || 'Miembro'}</h2>
              <h3 style="color: #ff6600;">${titulo}</h3>
              <p style="color: #555; line-height: 1.6; font-size: 16px; white-space: pre-line;">${cuerpo}</p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://appmotoe.web.app/" style="background-color: #ff6600; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Abrir Aplicación</a>
              </div>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 24px; text-align: center;">Este es un mensaje automático de la plataforma MOTO-E. Por favor no respondas a este correo.</p>
          </div>
        `
            })
        });

        if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            throw new Error("Resend Error: " + errorText);
        }

        await supabaseGlobal.from('edge_logs').insert({
            message: 'Email enviado correctamente',
            details: { email: profile.email }
        });

        return new Response(JSON.stringify({ status: 'success', sentTo: profile.email }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        if (supabaseGlobal) {
            await supabaseGlobal.from('edge_logs').insert({
                message: String(err?.message ?? err),
                details: JSON.stringify(err)
            });
        }
        return new Response(String(err?.message ?? err), { status: 500 });
    }
});
