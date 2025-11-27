import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, documentUrl } = await req.json();

    if (!userId || !documentUrl) {
      throw new Error('Missing userId or documentUrl');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting AI verification for user:', userId);

    // Extract the file path from the public URL
    const urlPath = new URL(documentUrl).pathname;
    const filePath = urlPath.replace('/storage/v1/object/public/id-documents/', '');
    
    console.log('Downloading document from storage:', filePath);
    
    // Download the image from Supabase storage using service role key
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('id-documents')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      throw new Error('Failed to download document from storage');
    }

    // Convert the blob to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binaryString);
    
    // Detect image mime type from file extension
    const extension = filePath.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                    extension === 'png' ? 'image/png' : 
                    extension === 'webp' ? 'image/webp' : 'image/jpeg';
    
    const base64DataUrl = `data:${mimeType};base64,${base64Image}`;
    
    console.log('Image converted to base64, size:', base64Image.length, 'mime type:', mimeType);

    // Call Lovable AI with vision capabilities to analyze the ID document
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an identity document verification AI. Analyze the provided ID document image and determine if it appears to be:
1. A valid government-issued identification document (passport, national ID card, driver's license)
2. Clear and readable with visible text and photo
3. Not altered, tampered with, or suspicious
4. Contains essential information (name, photo, document number, expiration date)

Respond with a JSON object containing:
- "approved": boolean (true if document appears valid, false if suspicious)
- "confidence": number between 0 and 1 (your confidence level)
- "reasons": array of strings explaining your decision
- "document_type": string (passport/national_id/drivers_license/unknown)
- "flags": array of strings for any concerns (blur/glare/tampering/missing_info/expired/etc)

Be strict but fair. Auto-approve only documents that are clearly valid with no red flags.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this identity document and verify its authenticity.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64DataUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI service payment required. Please contact support.');
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI verification service unavailable');
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('Invalid AI response');
    }

    console.log('AI Response:', aiMessage);

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiMessage.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       aiMessage.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiMessage;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI analysis result');
    }

    const {
      approved,
      confidence,
      reasons,
      document_type,
      flags
    } = analysisResult;

    // Determine verification status based on AI analysis
    let verificationMethod: string;
    let idVerified: boolean;
    let verificationNotes: string;

    // Auto-approve only if confidence is high (>= 0.85) and approved is true
    if (approved && confidence >= 0.85 && (!flags || flags.length === 0)) {
      verificationMethod = 'ai_approved';
      idVerified = true;
      verificationNotes = `✅ Document auto-verified by AI\nType: ${document_type}\nConfidence: ${(confidence * 100).toFixed(0)}%\nReasons: ${reasons.join(', ')}`;
    } else {
      verificationMethod = 'ai_flagged';
      idVerified = false;
      verificationNotes = `⚠️ Document flagged for manual review\nType: ${document_type}\nConfidence: ${(confidence * 100).toFixed(0)}%\nReasons: ${reasons.join(', ')}\nFlags: ${flags?.join(', ') || 'None'}`;
    }

    // Update user profile with verification result
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_method: verificationMethod,
        ai_confidence_score: confidence,
        verification_notes: verificationNotes,
        id_verified: idVerified,
        verified_at: idVerified ? new Date().toISOString() : null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw new Error('Failed to update verification status');
    }

    // Send notification to user
    if (idVerified) {
      await supabase.rpc('send_notification', {
        p_user_id: userId,
        p_title: '✅ Vérification automatique réussie',
        p_message: 'Votre document d\'identité a été vérifié automatiquement par notre système IA. Vous pouvez maintenant créer des annonces !',
        p_type: 'verification'
      });
    } else {
      await supabase.rpc('send_notification', {
        p_user_id: userId,
        p_title: '⏳ Vérification en cours',
        p_message: 'Votre document d\'identité nécessite une vérification manuelle par notre équipe. Nous vous contacterons sous 24-48h.',
        p_type: 'verification'
      });
    }

    console.log('Verification completed:', { verificationMethod, idVerified, confidence });

    return new Response(
      JSON.stringify({
        success: true,
        verificationMethod,
        idVerified,
        confidence,
        documentType: document_type,
        notes: verificationNotes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in verify-id-document function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});