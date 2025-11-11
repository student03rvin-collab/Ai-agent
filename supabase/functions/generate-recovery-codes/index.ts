import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating recovery codes for user: ${user.id}`);

    // Generate 8 cryptographically secure recovery codes
    const recoveryCodes: string[] = [];
    const codeHashes: string[] = [];

    for (let i = 0; i < 8; i++) {
      // Generate a cryptographically secure random code (12 characters)
      const array = new Uint8Array(9);
      crypto.getRandomValues(array);
      const code = Array.from(array, byte => byte.toString(36).toUpperCase()).join('').substring(0, 12);
      recoveryCodes.push(code);

      // Hash the code before storing (using Web Crypto API)
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      codeHashes.push(hashHex);
    }

    // Delete any existing recovery codes for this user
    const { error: deleteError } = await supabaseClient
      .from('mfa_recovery_codes')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting old recovery codes:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete old recovery codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the hashed codes in the database
    const codesToInsert = codeHashes.map(hash => ({
      user_id: user.id,
      code_hash: hash,
    }));

    const { error: insertError } = await supabaseClient
      .from('mfa_recovery_codes')
      .insert(codesToInsert);

    if (insertError) {
      console.error('Error inserting recovery codes:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store recovery codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated ${recoveryCodes.length} recovery codes for user: ${user.id}`);

    // Return the plain text codes (user will save these)
    return new Response(
      JSON.stringify({ recovery_codes: recoveryCodes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recovery-codes function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});