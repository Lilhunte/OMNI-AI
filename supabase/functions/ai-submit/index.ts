import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// The main AI webhook URL provided in the project description.
// IMPORTANT: For production, store this in your Supabase project's environment variables.
const AI_WEBHOOK_URL = 'https://boxer-rich-raccoon.ngrok-free.app/webhook-test/8a3ff405-b427-477e-aea6-8fdb35f963fe';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Authenticate the user from the incoming request
    const { data: { user } } = await supabaseClient.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Get the prompt and other data from the request body
    const { prompt, conversation_id, inputs, options } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Create a new job in the 'jobs' table
    const { data: newJob, error: jobError } = await supabaseClient
      .from('jobs')
      .insert({
        user_id: user.id,
        conversation_id: conversation_id || null,
        prompt: prompt,
        inputs: inputs || {},
        status: 'pending',
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Prepare the payload for the AI webhook
    const webhookPayload = {
      job_id: newJob.id,
      user: {
        id: user.id,
        email: user.email,
        plan: 'pro', // This should be fetched from the user's profile
      },
      prompt: prompt,
      inputs: inputs || {},
      options: options || {},
    };

    // 6. Forward the request to the main AI webhook (fire and forget)
    fetch(AI_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    }).catch(err => console.error('Error calling AI webhook:', err)); // Log error but don't block response

    // 7. Return the new job ID to the client
    return new Response(JSON.stringify({ jobId: newJob.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // Accepted
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});