import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, FileCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface IDDocumentUploadProps {
  documentUrl?: string;
  onUploadComplete?: (url?: string) => void;
}

const IDDocumentUpload = ({ documentUrl, onUploadComplete }: IDDocumentUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(documentUrl);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Le fichier doit être une image');
        return;
      }

      // Validate file size (max 10MB for documents)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('L\'image ne doit pas dépasser 10 MB');
        return;
      }

      setUploading(true);

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);

      // Update profile with document URL and submission timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id_document_url: publicUrl,
          id_submitted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Document téléchargé avec succès');
      setUploading(false);

      // Notify parent component with the URL for next step (selfie capture)
      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Vérification d'identité</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Téléchargez une photo claire de votre pièce d'identité (carte d'identité, passeport, ou permis de conduire).
          Notre système IA vérifiera automatiquement votre document.
        </p>

        {previewUrl && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <img 
              src={previewUrl} 
              alt="Document d'identité"
              className="w-full max-w-md mx-auto rounded"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="id-document-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => document.getElementById('id-document-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {previewUrl ? 'Changer le document' : 'Télécharger un document'}
                </>
              )}
            </Button>
          </label>
          <input
            id="id-document-upload"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Conseils pour une vérification rapide :</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Assurez-vous que tous les textes sont lisibles</li>
                <li>Évitez les reflets et les zones floues</li>
                <li>Le document doit être en cours de validité</li>
                <li>Votre photo doit être visible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default IDDocumentUpload;