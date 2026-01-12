import { createClient } from 'jsr:@supabase/supabase-js@2'
import admin from 'npm:firebase-admin@12'

// Configurar Service Account desde Secret
const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
if (!serviceAccountStr) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT secret is missing')
}

const serviceAccount = JSON.parse(serviceAccountStr)

// Inicializar Firebase Admin
// Evitar reinicialización si ya existe la app por defecto
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    })
}

Deno.serve(async (req) => {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 })
    }

    try {
        const payload = await req.json()
        // Payload esperado desde un Trigger, generalmente viene envuelto o es el record directo
        // Si viene de Trigger: { type: 'INSERT', table: 'notifications', record: { ... }, ... }
        // Asumiremos que el trigger envía el objeto JSON con el record
        const { record } = payload

        if (!record || !record.user_id) {
            return new Response(JSON.stringify({ error: 'Missing record or user_id' }), { status: 400 })
        }

        // Inicializar Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Buscar tokens del usuario
        const { data: tokens, error: tokenError } = await supabase
            .from('user_fcm_tokens')
            .select('token')
            .eq('user_id', record.user_id)

        if (tokenError) {
            console.error('Error fetching tokens:', tokenError)
            return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 })
        }

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No devices registered for this user.', sent: 0 }), {
                headers: { 'Content-Type': 'application/json' },
            })
        }

        const fcmTokens = tokens.map(t => t.token)

        // Enviar Multicast
        const message = {
            tokens: fcmTokens,
            notification: {
                title: record.title || 'Nueva Notificación',
                body: record.body || '',
            },
            data: {
                link: record.link || '',
                id: record.id?.toString() || '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for many frameworks, helps PWA too sometimes
            }
        }

        const batchResponse = await admin.messaging().sendEachForMulticast(message)

        // Limpieza de tokens inválidos
        if (batchResponse.failureCount > 0) {
            const invalidTokens: string[] = []
            batchResponse.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errCode = resp.error?.code
                    if (
                        errCode === 'messaging/registration-token-not-registered' ||
                        errCode === 'messaging/invalid-registration-token'
                    ) {
                        invalidTokens.push(fcmTokens[idx])
                    }
                }
            })

            if (invalidTokens.length > 0) {
                await supabase
                    .from('user_fcm_tokens')
                    .delete()
                    .in('token', invalidTokens)
                console.log(`Cleaned up ${invalidTokens.length} invalid tokens.`)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent: batchResponse.successCount,
                failed: batchResponse.failureCount,
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )

    } catch (err: any) {
        console.error('Edge Function Error:', err)
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
