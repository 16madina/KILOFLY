import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security thresholds - adjusted for real-world conditions
const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 0.85;
const FACE_MATCH_THRESHOLD = 0.60; // Lowered for real-world selfie conditions
const MANUAL_REVIEW_THRESHOLD = 0.60;
const REJECT_THRESHOLD = 0.35;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

// Helper function to get mime type from URL/path
function getMimeType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() || 'png';
  return extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
         extension === 'png' ? 'image/png' : 
         extension === 'webp' ? 'image/webp' : 'image/jpeg';
}

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

    console.log('Starting enhanced AI verification with face comparison for user:', userId);
    console.log('Timestamp:', new Date().toISOString());

    // Verify user exists and get their profile with avatar
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, id_verified, id_document_url, full_name, avatar_url')
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

    // Check if user has an avatar for face comparison
    const hasAvatar = existingProfile.avatar_url && existingProfile.avatar_url.trim() !== '';
    console.log('User has avatar for face comparison:', hasAvatar);

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

    // Extract the file path from the document URL
    const urlPath = new URL(documentUrl).pathname;
    const filePath = urlPath.replace('/storage/v1/object/public/id-documents/', '');
    
    console.log('Downloading ID document from storage:', filePath);
    
    // Download the ID document
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

    console.log('ID document validated - Size:', fileSizeMB.toFixed(2), 'MB');

    // Convert ID document to base64
    const idDocBase64 = await blobToBase64(fileData);
    const idDocMimeType = getMimeType(filePath);
    const idDocDataUrl = `data:${idDocMimeType};base64,${idDocBase64}`;

    // Download and convert avatar if available
    let avatarDataUrl: string | null = null;
    if (hasAvatar) {
      try {
        // Check if avatar is from our storage or external URL
        if (existingProfile.avatar_url.includes('avatars')) {
          const avatarPath = new URL(existingProfile.avatar_url).pathname
            .replace('/storage/v1/object/public/avatars/', '');
          
          console.log('Downloading avatar from storage:', avatarPath);
          
          const { data: avatarData, error: avatarError } = await supabase
            .storage
            .from('avatars')
            .download(avatarPath);

          if (!avatarError && avatarData) {
            const avatarBase64 = await blobToBase64(avatarData);
            const avatarMimeType = getMimeType(avatarPath);
            avatarDataUrl = `data:${avatarMimeType};base64,${avatarBase64}`;
            console.log('Avatar loaded successfully for face comparison');
          }
        } else if (existingProfile.avatar_url.startsWith('http')) {
          // External URL - fetch directly
          console.log('Fetching external avatar URL');
          const avatarResponse = await fetch(existingProfile.avatar_url);
          if (avatarResponse.ok) {
            const avatarBlob = await avatarResponse.blob();
            const avatarBase64 = await blobToBase64(avatarBlob);
            avatarDataUrl = `data:${avatarBlob.type || 'image/jpeg'};base64,${avatarBase64}`;
            console.log('External avatar loaded successfully');
          }
        }
      } catch (avatarError) {
        console.error('Error loading avatar:', avatarError);
        // Continue without avatar - face comparison will be skipped
      }
    }

    // Build the AI analysis prompt - now includes NAME VERIFICATION
    const userFullName = existingProfile.full_name || '';
    const nameParts = userFullName.trim().split(/\s+/);
    
    console.log('User registered name:', userFullName);
    console.log('Name parts to verify:', nameParts);
    
    const systemPrompt = `You are a STRICT identity document verification AI for KiloFly, a luggage-sharing marketplace. Your role is CRITICAL for fraud prevention.

## DOCUMENT ANALYSIS REQUIREMENTS

Analyze the provided ID document image for ALL of the following:

### 1. DOCUMENT AUTHENTICITY (20% weight)
- Is this a real government-issued document (passport, national ID card, driver's license)?
- Check for official watermarks, holograms, and security features
- Look for signs of digital manipulation (Photoshop, AI-generated)
- Verify document format matches known templates

### 2. IMAGE QUALITY (10% weight)
- Is the text clearly readable?
- Is the photo visible and clear?
- No excessive blur, glare, or shadows
- Document fully visible without cropping

### 3. DOCUMENT VALIDITY (15% weight)  
- Check if document appears expired (look for expiration date)
- Verify document number format is realistic
- Check for valid issue dates
- Ensure all required fields are present

### 4. FRAUD INDICATORS (15% weight)
- Check for photo tampering or overlay
- Look for text inconsistencies or different fonts
- Detect signs of physical document alteration
- Verify hologram/security feature visibility
- Check for screenshot of another document
- Detect if this is a photo of a screen

### 5. FACE DETECTION ON ID (15% weight)
- Is there a clear human face visible on the ID document?
- Is the face photo of good quality?
- Does the face appear natural (not AI-generated)?

### 6. NAME VERIFICATION (25% weight - CRITICAL)
The user registered with the name: "${userFullName}"
- Extract the FULL NAME visible on the ID document
- Check if AT LEAST the first name AND last name from the registered name appear on the document
- Names can be in different order (e.g., "LASTNAME FIRSTNAME" vs "FIRSTNAME LASTNAME")
- Be tolerant of:
  - Accents/diacritics (é vs e, ç vs c, etc.)
  - Case differences (JEAN vs Jean)
  - Minor spelling variations (Jean-Pierre vs Jean Pierre)
  - Middle names (document may have more names than registered)
  - Hyphenated names
- The key requirement: At least ONE first name and ONE last name from the registered name must match the document
- If the registered name is "John Smith", the document must show "John" AND "Smith" somewhere

${avatarDataUrl ? `
### 7. FACE COMPARISON (Important verification)
A second image (user's selfie/profile photo) is provided.
- Compare the face on the ID document with the selfie
- Check if it appears to be the SAME PERSON
- Look for similar facial features: eyes, nose, mouth shape, face shape
- BE TOLERANT of:
  - Different lighting conditions (natural vs artificial light)
  - Different angles (selfies are often taken at slight angles)
  - Different image quality (phone cameras vary)
  - Age differences up to 5-10 years (ID photos may be older)
  - Glasses/no glasses, facial hair differences
  - Minor expressions differences (smile vs neutral)
- Focus on CORE IDENTIFYING FEATURES: eye shape, nose structure, face shape
- Only reject if faces are CLEARLY different people (different ethnicity, completely different bone structure)
- If comparison is uncertain due to image quality, prefer manual_review over rejection
` : ''}

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
    "appears_expired": boolean,
    "full_name_on_document": string (the complete name as shown on the ID),
    "first_name_found": string or null,
    "last_name_found": string or null
  },
  "name_verification": {
    "name_matches": boolean,
    "registered_name": "${userFullName}",
    "document_name": string,
    "match_details": string (explain what matched or didn't match)
  },
  "quality_score": number (0.0 to 1.0),
  "authenticity_score": number (0.0 to 1.0),
  "face_detection": {
    "face_found_on_id": boolean,
    "face_quality": "good" | "fair" | "poor" | "none"
  },
  ${avatarDataUrl ? `"face_comparison": {
    "match_score": number (0.0 to 1.0),
    "same_person": boolean,
    "comparison_notes": string
  },` : ''}
  "fraud_risk": "low" | "medium" | "high" | "critical",
  "reasons": string[],
  "flags": string[],
  "recommendation": "auto_approve" | "manual_review" | "reject"
}

## DECISION CRITERIA

- AUTO_APPROVE: confidence >= 0.85, fraud_risk = "low", no flags, name_verification.name_matches = true, all quality checks pass${avatarDataUrl ? ', face_comparison.same_person = true with match_score >= 0.60' : ''}
- MANUAL_REVIEW: confidence 0.60-0.84 OR fraud_risk = "medium" OR minor flags OR name_verification.name_matches = false (uncertain)${avatarDataUrl ? ' OR face match uncertain OR match_score between 0.40-0.59' : ''}
- REJECT: confidence < 0.35 OR fraud_risk = "critical" OR obvious fraud detected${avatarDataUrl ? ' OR face_comparison.same_person = false AND match_score < 0.30 (clearly different people)' : ''}

IMPORTANT: Even if AI approves, a human administrator will perform a final verification. Your role is to flag obvious issues and pre-screen documents.

Be REASONABLE. Real-world photos vary in quality. Only reject when there's CLEAR evidence of fraud, completely different faces, or completely different names.`;

    // Build message content with images
    const messageContent: any[] = [
      {
        type: 'text',
        text: `Analyze this identity document submitted by user "${existingProfile.full_name}". Perform thorough security verification.${avatarDataUrl ? ' A second image is the user\'s profile photo/selfie for face comparison.' : ''}`
      },
      {
        type: 'image_url',
        image_url: { url: idDocDataUrl }
      }
    ];

    // Add avatar for face comparison if available
    if (avatarDataUrl) {
      messageContent.push({
        type: 'text',
        text: 'User\'s selfie/profile photo for face comparison:'
      });
      messageContent.push({
        type: 'image_url',
        image_url: { url: avatarDataUrl }
      });
    }

    console.log('Calling AI with', avatarDataUrl ? '2 images (ID + selfie)' : '1 image (ID only)');

    // Call Lovable AI with enhanced vision analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageContent }
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

    console.log('AI Response received');

    // Parse AI response
    let analysisResult;
    try {
      const jsonMatch = aiMessage.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       aiMessage.match(/(\{[\s\S]*\})/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiMessage;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysisResult = {
        approved: false,
        confidence: 0.5,
        fraud_risk: 'medium',
        recommendation: 'manual_review',
        reasons: ['AI response parsing failed - manual review required'],
        flags: ['parsing_error'],
        face_detection: { face_found_on_id: false, face_quality: 'none' }
      };
    }

    const {
      approved,
      confidence,
      document_type,
      extracted_info,
      quality_score,
      authenticity_score,
      face_detection,
      face_comparison,
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
      face_found: face_detection?.face_found_on_id,
      face_match: face_comparison?.same_person,
      face_match_score: face_comparison?.match_score,
      flags_count: flags?.length || 0
    });

    // Enhanced decision logic with face comparison
    let verificationMethod: string;
    let idVerified: boolean;
    let verificationNotes: string;

    // CRITICAL: Only reject face mismatch if match score is very low (clearly different people)
    if (face_comparison && face_comparison.same_person === false && (face_comparison.match_score || 0) < 0.30) {
      verificationMethod = 'ai_rejected';
      idVerified = false;
      verificationNotes = `🚨 VISAGE NON CORRESPONDANT\n` +
        `Le visage sur le document ne correspond PAS au selfie de profil.\n` +
        `Score de correspondance: ${((face_comparison.match_score || 0) * 100).toFixed(0)}%\n` +
        `Notes: ${face_comparison.comparison_notes || 'Différences faciales significatives détectées'}\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Risque: CRITIQUE - Possible usurpation d'identité`;
        
      console.warn('CLEAR FACE MISMATCH detected for user:', userId);
    }
    // Uncertain face match - flag for manual review
    else if (face_comparison && face_comparison.same_person === false && (face_comparison.match_score || 0) >= 0.30) {
      verificationMethod = 'ai_flagged';
      idVerified = false;
      verificationNotes = `⚠️ VÉRIFICATION MANUELLE REQUISE\n` +
        `Correspondance faciale incertaine.\n` +
        `Score de correspondance: ${((face_comparison.match_score || 0) * 100).toFixed(0)}%\n` +
        `Notes: ${face_comparison.comparison_notes || 'Comparaison difficile - qualité image ou angle'}\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Un administrateur vérifiera votre document.`;
        
      console.log('Uncertain face match, flagging for manual review:', userId);
    }
    // Check for critical fraud indicators only
    else if (fraud_risk === 'critical') {
      verificationMethod = 'ai_rejected';
      idVerified = false;
      verificationNotes = `🚨 RISQUE DE FRAUDE CRITIQUE DÉTECTÉ\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Niveau risque: ${fraud_risk.toUpperCase()}\n` +
        `Problèmes: ${flags?.join(', ') || 'N/A'}\n` +
        `Raisons: ${reasons?.join(', ') || 'N/A'}`;
        
      console.warn('CRITICAL FRAUD RISK detected for user:', userId);
    }
    // High risk - flag for manual review instead of auto-reject
    else if (fraud_risk === 'high') {
      verificationMethod = 'ai_flagged';
      idVerified = false;
      verificationNotes = `⚠️ VÉRIFICATION MANUELLE REQUISE\n` +
        `Risque élevé détecté - révision manuelle nécessaire.\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Niveau risque: ${fraud_risk.toUpperCase()}\n` +
        `Problèmes: ${flags?.join(', ') || 'N/A'}`;
        
      console.log('HIGH RISK flagged for manual review:', userId);
    }
    // Check for name mismatch - flag for review
    else if (analysisResult.name_verification && analysisResult.name_verification.name_matches === false) {
      verificationMethod = 'ai_flagged';
      idVerified = false;
      verificationNotes = `⚠️ VÉRIFICATION DU NOM REQUISE\n` +
        `Nom inscrit: ${analysisResult.name_verification.registered_name}\n` +
        `Nom sur document: ${analysisResult.name_verification.document_name || 'Non détecté'}\n` +
        `Détails: ${analysisResult.name_verification.match_details || 'Correspondance incertaine'}\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Un administrateur vérifiera votre document.`;
        
      console.log('NAME MISMATCH flagged for manual review:', userId);
    }
    // AI pre-approved - BUT requires admin confirmation
    else if (
      approved && 
      confidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD && 
      fraud_risk === 'low' &&
      (!flags || flags.length === 0) &&
      recommendation === 'auto_approve' &&
      face_detection?.face_found_on_id &&
      (!face_comparison || (face_comparison.same_person && face_comparison.match_score >= FACE_MATCH_THRESHOLD)) &&
      analysisResult.name_verification?.name_matches !== false
    ) {
      // AI approved but still needs admin confirmation
      verificationMethod = 'ai_pre_approved';
      idVerified = false; // NOT verified until admin confirms
      
      let faceInfo = '';
      if (face_comparison) {
        faceInfo = `\n✅ Correspondance faciale: ${((face_comparison.match_score || 0) * 100).toFixed(0)}%`;
      }
      
      let nameInfo = '';
      if (analysisResult.name_verification) {
        nameInfo = `\n✅ Nom vérifié: ${analysisResult.name_verification.document_name || 'Correspond'}`;
      }
      
      verificationNotes = `✅ PRÉ-APPROUVÉ PAR IA - En attente de confirmation admin\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Qualité: ${((quality_score || 0) * 100).toFixed(0)}%\n` +
        `Authenticité: ${((authenticity_score || 0) * 100).toFixed(0)}%${faceInfo}${nameInfo}\n` +
        `Raisons: ${reasons?.join(', ') || 'Document valide'}`;
        
      console.log('AI PRE-APPROVED, awaiting admin confirmation:', userId);
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
      if (!face_detection?.face_found_on_id) reviewReasons.push('Visage non détecté sur le document');
      if (face_comparison && face_comparison.match_score < FACE_MATCH_THRESHOLD && face_comparison.same_person !== false) {
        reviewReasons.push(`Correspondance faciale incertaine (${((face_comparison.match_score || 0) * 100).toFixed(0)}%)`);
      }
      
      let faceInfo = '';
      if (face_comparison) {
        faceInfo = `\nCorrespondance faciale: ${((face_comparison.match_score || 0) * 100).toFixed(0)}%\n` +
          `Notes comparaison: ${face_comparison.comparison_notes || 'N/A'}`;
      }
      
      verificationNotes = `⚠️ RÉVISION MANUELLE REQUISE\n` +
        `Type: ${document_type || 'unknown'}\n` +
        `Score confiance: ${(confidence * 100).toFixed(0)}%\n` +
        `Niveau risque: ${fraud_risk || 'unknown'}\n` +
        `Qualité: ${((quality_score || 0) * 100).toFixed(0)}%\n` +
        `Authenticité: ${((authenticity_score || 0) * 100).toFixed(0)}%${faceInfo}\n` +
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

    if (verificationMethod === 'ai_pre_approved') {
      notificationTitle = '✅ Pré-approbation IA réussie';
      notificationMessage = 'Votre document a passé la vérification automatique ! Un administrateur confirmera votre identité sous 24h.';
      notificationType = 'success';
    } else if (verificationMethod === 'ai_rejected') {
      notificationTitle = '❌ Vérification échouée';
      notificationMessage = face_comparison?.same_person === false 
        ? 'Le visage sur votre document ne correspond pas à votre photo de profil. Veuillez vérifier que vous soumettez votre propre document.'
        : analysisResult.name_verification?.name_matches === false
        ? 'Le nom sur votre document ne correspond pas à celui de votre compte. Veuillez vérifier vos informations.'
        : 'Votre document a été rejeté pour des raisons de sécurité. Veuillez soumettre un document valide et authentique.';
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
      face_compared: !!face_comparison,
      face_match: face_comparison?.same_person,
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
        faceDetection: face_detection,
        faceComparison: face_comparison || null,
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
