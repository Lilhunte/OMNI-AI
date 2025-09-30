import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'https://deno.land/x/svix@v1.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Types for Clerk Webhook ---
interface UserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: { email_address: string }[];
  image_url: string;
}

interface WebhookEvent {
  data: UserData;
  object: 'event';
  type: 'user.created' | 'user.updated' | 'user.deleted';
}

// --- Main Function Logic ---
serve(async (req) => {
  // 1. Get the webhook signing secret from environment variables.
  //    IMPORTANT: You must set this in your Supabase project's Edge Function settings.
  const signingSecret = Deno.env.get('CLERK_WEBHOOK_SIGNING_SECRET');
  if (!signingSecret) {
    console.error('CLERK_WEBHOOK_SIGNING_SECRET is not set in environment variables.');
    return new Response('Internal Server Error: Missing signing secret', { status: 500 });
  }

  // 2. Verify the webhook signature.
  const headers = req.headers;
  const payload = await req.json();
  const wh = new Webhook(signingSecret);

  try {
    wh.verify(JSON.stringify(payload), {
      'svix-id': headers.get('svix-id')!,
      'svix-timestamp': headers.get('svix-timestamp')!,
      'svix-signature': headers.get('svix-signature')!,
    });
  } catch (err) {
    console.error('Error verifying webhook signature:', err.message);
    return new Response('Error occured: Invalid signature', { status: 400 });
  }

  // 3. Handle the webhook event.
  const event = payload as WebhookEvent;
  const { id, image_url, email_addresses } = event.data;
  const email = email_addresses.length > 0 ? email_addresses[0].email_address : null;

  // Create a Supabase client with the service role key
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (event.type === 'user.created' || event.type === 'user.updated') {
    console.log(`Processing ${event.type} for user ${id}`);
    const { error } = await supabaseClient.from('profiles').upsert({
      id: id,
      avatar_url: image_url,
      email: email,
      // You can add more fields here like display_name if needed
      // display_name: `${event.data.first_name || ''} ${event.data.last_name || ''}`.trim()
    }, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting user profile:', error);
      return new Response(`Database error: ${error.message}`, { status: 500 });
    }

    console.log(`Successfully upserted profile for user ${id}`);
  }

  // TODO: Add handling for 'user.deleted' if needed.
  // For example, you might want to delete or anonymize the user's data.

  return new Response('Webhook received and processed successfully', { status: 200 });
});