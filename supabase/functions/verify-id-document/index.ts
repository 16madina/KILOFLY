import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security thresholds
const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.90; // Increased from 0.85
const MANUAL_REVIEW_THRESHOLD = 0.70;
const REJECT_THRESHOLD = 0.40;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, documentUrl } = await req.json();

    // Input validation
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid or missing userId');
    }
    
    if (!documentUrl || typeof documentUrl !== 'string') {
      throw new Error('Invalid or missing documentUrl');
    }

    // Validate UUID format for userId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error('Invalid userId format');
    }

    // Validate document URL is from our storage
    if (!documentUrl.includes('id-documents')) {
      throw new Error('Invalid document URL: must be from id-documents storage');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Starting enhanced AI verification for user:', userId);
    console.log('Timestamp:', new Date().toISOString());

    // Verify user exists and hasn't already been verified
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, id_verified, id_document_url, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !existingProfile) {
      throw new Error('User profile not found');
    }

    if (existingProfile.id_verified) {
      console.log('User already verified, skipping:', userId);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already verified',
          idVerified: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for duplicate document submissions (fraud prevention)
    const { data: duplicateCheck } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id_document_url', documentUrl)
      .neq('id', userId);

    if (duplicateCheck && duplicateCheck.length > 0) {
      console.warn('Duplicate document detected:', documentUrl);
      
      await supabase.from('profiles').update({
        verification_method: 'ai_rejected',
        verification_notes: '🚨 FRAUDE DÉTECTÉE: Ce document a déjà été soumis par un autre utilisateur. Vérification refusée.',
        id_verified: false
      }).eq('id', userId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Duplicate document detected',
          fraud: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // File size validation
    const fileSizeMB = fileData.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max ${MAX_FILE_SIZE_MB}MB)`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(fileData.type)) {
      throw new Error(`Invalid file type: ${fileData.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    console.log('File validated - Size:', fileSizeMB.toFixed(2), 'MB, Type:', fileData.type);

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

    // Enhanced AI prompt with more security checks
    const systemPrompt = `You are a STRICT identity document verification AI for KiloFly, a luggage-sharing marketplace. Your role is CRITICAL for fraud prevention.

## DOCUMENT ANALYSIS REQUIREMENTS

Analyze the provided ID document image for ALL of the following:

### 1. DOCUMENT AUTHENTICITY (30% weight)
- Is this a real government-issued document (passport, national ID card, driver's license)?
- Check for official watermarks, holograms, and security features
- Look for signs of digital manipulation (Photoshop, AI-generated)
- Verify document format matches known templates

### 2. IMAGE QUALITY (20% weight)
- Is the text clearly readable?
- Is the photo visible and clear?
- No excessive blur, glare, or shadows
- Document fully visible without cropping

### 3. DOCUMENT VALIDITY (25% weight)  
- Check if document appears expired (look for expiration date)
- Verify document number format is realistic
- Check for valid issue dates
- Ensure all required fields are present

### 4. FRAUD INDICATORS (25% weight)
- Check for photo tampering or overlay
- Look for text inconsistencies or different fonts
- Detect signs of physical document alteration
- Verify hologram/security feature visibility
- Check for screenshot of another document
- Detect if this is a photo of a screen

## RESPONSE FORMAT

Respond with ONLY a JSON object (no markdown):
{
  "approved": boolean,
  "confidence": number (0.0 to 1.0),
  "document_type": "passport" | "national_id" | "drivers_license" | "unknown",
  "extracted_info": {
    "document_country": string or null,
    "document_number_visible": boolean,
    "photo_visible": boolean,
    "expiration_visible": boolean,
    "appears_expired": boolean
  },
  "quality_score": number (0.0 to 1.0),
  "authenticity_score": number (0.0 to 1.0),
  "fraud_risk": "low" | "medium" | "high" | "critical",
  "reasons": string[],
  "flags": string[],
  "recommendation": "auto_approve" | "manual_review" | "reject"
}

## DECISION CRITERIA

- AUTO_APPROVE: confidence >= 0.90, fraud_risk = "low", no flags, all quality checks pass
- MANUAL_REVIEW: confidence 0.70-0.89 OR fraud_risk = "medium" OR minor flags
- REJECT: confidence < 0.40 OR fraud_risk = "high"/"critical" OR obvious fraud

BE STRICT. When in doubt, flag for manual review. Never auto-approve suspicious documents.`;

    // Call Lovable AI with enhanced vision analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro', // Using Pro for better accuracy
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this identity document submitted by user "${existingProfile.full_name}". Perform thorough security verification.`
              },
              {
                type: 'image_url',
                image_url: { url: base64DataUrl }
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
      const jsonMatch = aiMessage.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       aiMessage.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiMessage;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Flag for manual review if parsing fails
      analysisResult = {
        approved: false,
        confidence: 0.5,
        fraud_risk: 'medium',
        recommendation: 'manual_review',
        reasons: ['AI response parsing failed - manual review required'],
        flags: ['parsing_error']
      };
    }

    const {
      approved,
      confidence,
      document_type,
      extracted_info,
      quality_score,
      authenticity_score,
      fraud_risk,
      reasons,
      flags,
      recommendation
    } = analysisResult;

    console.log('Analysis result:', {
      approved,
      confidence,
      fraud_risk,
      recommendation,
      flags_count: flags?.length || 0
    });

    // Enhanced decision logic with multiple security layers
    let verificationMethod: string;
    let idVerified: boolean;
    let verificationNotes: string;

    // CRITICAL: Check for high-risk fraud indicators first
    if (fraud_risk === 'critical' || fraud_risk === 'high') {
      verificationMethod = 'ai_rejected';
      idVerified = false;
      verificationNotes = `🚨 RISQUE ÉLEVÉ DE FRAUDE DÉTECTÉ\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Niveau risque: ${fraud_risk.toUpperCase()}\n` +
        `Problèmes: ${flags?.join(', ') || 'N/A'}\n` +
        `Raisons: ${reasons?.join(', ') || 'N/A'}`;
        
      console.warn('HIGH FRAUD RISK detected for user:', userId);
    }
    // Auto-approve only with very high confidence and no risk
    else if (
      approved && 
      confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD && 
      fraud_risk === 'low' &&
      (!flags || flags.length === 0) &&
      recommendation === 'auto_approve'
    ) {
      verificationMethod = 'ai_approved';
      idVerified = true;
      verificationNotes = `✅ Document vérifié automatiquement par IA\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Qualité: ${((quality_score || 0) * 100).toFixed(0)}%\n` +
        `Authenticité: ${((authenticity_score || 0) * 100).toFixed(0)}%\n` +
        `Raisons: ${reasons?.join(', ') || 'Document valide'}`;
        
      console.log('AUTO-APPROVED:', userId);
    }
    // Flag for manual review in all other cases
    else {
      verificationMethod = 'ai_flagged';
      idVerified = false;
      
      const reviewReasons = [];
      if (confidence < MANUAL_REVIEW_THRESHOLD) reviewReasons.push('Score confiance insuffisant');
      if (fraud_risk === 'medium') reviewReasons.push('Risque moyen détecté');
      if (flags && flags.length > 0) reviewReasons.push(`Alertes: ${flags.join(', ')}`);
      if (extracted_info?.appears_expired) reviewReasons.push('Document potentiellement expiré');
      
      verificationNotes = `⚠️ RÉVISION MANUELLE REQUISE\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Niveau risque: ${fraud_risk || 'unknown'}\n` +
        `Qualité: ${((quality_score || 0) * 100).toFixed(0)}%\n` +
        `Authenticité: ${((authenticity_score || 0) * 100).toFixed(0)}%\n` +
        `Raisons de révision: ${reviewReasons.join('; ')}\n` +
        `Analyse IA: ${reasons?.join(', ') || 'N/A'}`;
        
      console.log('FLAGGED FOR REVIEW:', userId, reviewReasons);
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

    // Send appropriate notification to user
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: string;

    if (idVerified) {
      notificationTitle = '✅ Vérification automatique réussie';
      notificationMessage = 'Votre document d\'identité a été vérifié automatiquement. Vous pouvez maintenant créer des annonces et effectuer des réservations !';
      notificationType = 'success';
    } else if (verificationMethod === 'ai_rejected') {
      notificationTitle = '❌ Document rejeté';
      notificationMessage = 'Votre document a été rejeté pour des raisons de sécurité. Veuillez soumettre un document valide et authentique.';
      notificationType = 'error';
    } else {
      notificationTitle = '⏳ Vérification en cours';
      notificationMessage = 'Votre document nécessite une vérification manuelle par notre équipe. Délai estimé: 24-48h.';
      notificationType = 'info';
    }

    await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_title: notificationTitle,
      p_message: notificationMessage,
      p_type: notificationType
    });

    console.log('Verification completed:', { 
      userId,
      verificationMethod, 
      idVerified, 
      confidence,
      fraud_risk,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        verificationMethod,
        idVerified,
        confidence,
        documentType: document_type,
        fraudRisk: fraud_risk,
        qualityScore: quality_score,
        authenticityScore: authenticity_score,
        notes: verificationNotes,
        flags: flags || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in verify-id-document function:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    
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
