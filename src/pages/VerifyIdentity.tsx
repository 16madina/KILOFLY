import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import IDDocumentUpload from "@/components/IDDocumentUpload";

interface VerificationStatus {
  id_verified: boolean;
  id_document_url: string | null;
  verification_method: string | null;
  verification_notes: string | null;
  ai_confidence_score: number | null;
}

const VerifyIdentity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchVerificationStatus();
  }, [user, navigate]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id_verified, id_document_url, verification_method, verification_notes, ai_confidence_score')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setStatus(data);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.id_verified) {
      return (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <div>
            <p className="font-semibold">✅ Identité vérifiée</p>
            <p className="text-sm">Vous pouvez maintenant créer des annonces</p>
          </div>
        </div>
      );
    }

    if (status.verification_method === 'ai_flagged') {
      return (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
          <Clock className="h-5 w-5" />
          <div>
            <p className="font-semibold">⏳ Vérification manuelle en cours</p>
            <p className="text-sm">Notre équipe examine votre document (24-48h)</p>
            {status.verification_notes && (
              <p className="text-xs mt-2 opacity-80">{status.verification_notes}</p>
            )}
          </div>
        </div>
      );
    }

    if (status.verification_method === 'manual_rejected') {
      return (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <XCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">❌ Document rejeté</p>
            <p className="text-sm">Veuillez soumettre un nouveau document</p>
            {status.verification_notes && (
              <p className="text-xs mt-2 opacity-80">{status.verification_notes}</p>
            )}
          </div>
        </div>
      );
    }

    if (status.id_document_url && !status.verification_method) {
      return (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div>
            <p className="font-semibold">🔄 Traitement en cours</p>
            <p className="text-sm">Vérification en cours...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400">
        <Clock className="h-5 w-5" />
        <div>
          <p className="font-semibold">📝 Vérification nécessaire</p>
          <p className="text-sm">Téléchargez votre pièce d'identité pour commencer</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="container flex items-center gap-4 py-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/profile')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Vérification d'identité</h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Status Badge */}
        {getStatusBadge()}

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            Vérification automatique par IA
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Notre système d'intelligence artificielle analyse automatiquement votre document 
              pour vérifier son authenticité en quelques secondes.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>✅ <strong>Vérification instantanée</strong> : La plupart des documents sont approuvés en moins d'une minute</li>
              <li>⚠️ <strong>Révision manuelle</strong> : Si l'IA détecte des anomalies, un admin vérifiera sous 24-48h</li>
              <li>🔒 <strong>Sécurisé</strong> : Vos données sont chiffrées et conformes RGPD</li>
            </ul>
          </div>
        </Card>

        {/* Upload Component */}
        {(!status?.id_verified || status?.verification_method === 'manual_rejected') && (
          <IDDocumentUpload 
            documentUrl={status?.id_document_url || undefined}
            onUploadComplete={fetchVerificationStatus}
          />
        )}

        {/* Help Section */}
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Besoin d'aide ?</h4>
          <p className="text-sm text-muted-foreground">
            Si vous rencontrez des difficultés avec la vérification, contactez notre support à{' '}
            <a href="mailto:support@kilofly.com" className="text-primary hover:underline">
              support@kilofly.com
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default VerifyIdentity;