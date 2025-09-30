import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface WebhookOutput {
  text?: string;
  code?: string;
  images?: string[];
  videos?: string[];
  audio?: string[];
  sources?: { title: string; url: string; snippet: string }[];
}

interface CallbackPayload {
  job_id: string;
  status: 'completed' | 'failed';
  outputs: WebhookOutput;
}

serve(async (req) => {
  // 1. Verify the secret token from the Authorization header
  const callbackSecret = Deno.env.get('AI_CALLBACK_SECRET');
  const authHeader = req.headers.get('Authorization');

  if (!callbackSecret || authHeader !== `Bearer ${callbackSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload: CallbackPayload = await req.json();
    const { job_id, status, outputs } = payload;

    // 2. Initialize Supabase admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Fetch the original job to get user_id and conversation_id
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('user_id, conversation_id')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', job_id, jobError);
      return new Response('Job not found', { status: 404 });
    }

    // 4. Update the job status and store the outputs
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({ status: status, outputs: outputs as any })
      .eq('id', job_id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      // Continue anyway to try and post the message
    }

    // 5. Create new message(s) in the conversation with the results
    if (status === 'completed' && job.conversation_id) {
      const messagesToInsert = [];

      if (outputs.text) {
        messagesToInsert.push({
          conversation_id: job.conversation_id,
          sender_id: job.user_id, // Or a dedicated AI user ID
          kind: 'text',
          body: outputs.text,
        });
      }
      if (outputs.code) {
        messagesToInsert.push({
          conversation_id: job.conversation_id,
          sender_id: job.user_id,
          kind: 'code',
          body: outputs.code,
        });
      }
      if (outputs.images && outputs.images.length > 0) {
        messagesToInsert.push({
          conversation_id: job.conversation_id,
          sender_id: job.user_id,
          kind: 'image',
          media: { urls: outputs.images },
        });
      }
      // Add similar blocks for video, audio, etc.

      if (messagesToInsert.length > 0) {
        const { error: messageError } = await supabaseClient
          .from('messages')
          .insert(messagesToInsert);

        if (messageError) {
          console.error('Error creating message:', messageError);
        }
      }
    }

    return new Response('Callback received successfully', { status: 200 });

  } catch (error) {
    console.error('An unexpected error occurred in callback:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});