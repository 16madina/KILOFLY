import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, FileCheck, AlertCircle, Check, RotateCcw, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface IDDocumentUploadProps {
  documentUrl?: string;
  onUploadComplete?: (url?: string) => void;
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'uploaded';

const IDDocumentUpload = ({ documentUrl, onUploadComplete }: IDDocumentUploadProps) => {
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>(documentUrl ? 'uploaded' : 'idle');
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(documentUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
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

      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreview(reader.result as string);
        setSelectedFile(file);
        setUploadState('preview');
      };
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Error selecting file:', error);
      toast.error('Erreur lors de la sélection du fichier');
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile || !user) {
      toast.error('Aucun fichier sélectionné');
      return;
    }

    setUploadState('uploading');

    try {
      // Upload to Supabase storage
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('id-documents')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);

      // Update profile with document URL, reset verification status for new attempt
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          id_document_url: publicUrl,
          id_submitted_at: new Date().toISOString(),
          // Reset verification status for new document submission
          verification_method: 'pending',
          verification_notes: null,
          ai_confidence_score: null,
          id_verified: false,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setUploadState('uploaded');
      setLocalPreview(null);
      setSelectedFile(null);

      // Show success briefly then notify parent to proceed to next step
      toast.success('Document enregistré ! Passage à la vérification faciale...');
      
      // Small delay for user feedback, then proceed to next step
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete(publicUrl);
        }
      }, 800);

    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Erreur lors du téléchargement');
      setUploadState('preview');
    }
  };

  const handleRetry = () => {
    setLocalPreview(null);
    setSelectedFile(null);
    setUploadState('idle');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeDocument = () => {
    handleRetry();
    // Trigger file picker after reset
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const displayPreview = localPreview || previewUrl;

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

        {/* Document Preview Area */}
        <AnimatePresence mode="wait">
          {displayPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-xl border-2 border-dashed border-primary/30 p-4 bg-primary/5"
            >
              <div className="relative">
                <img 
                  src={displayPreview} 
                  alt="Document d'identité"
                  className="w-full max-h-64 object-contain mx-auto rounded-lg shadow-md"
                />
                
                {/* Status badge */}
                {uploadState === 'preview' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-2 right-2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full"
                  >
                    À confirmer
                  </motion.div>
                )}
                {uploadState === 'uploaded' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-2 right-2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Enregistré
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 bg-muted/30"
            >
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Document d'identité</p>
                  <p className="text-sm text-muted-foreground">
                    Cliquez ci-dessous pour ajouter
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {uploadState === 'preview' && (
              <motion.div
                key="confirm-buttons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-3"
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recommencer
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirm}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirmer
                </Button>
              </motion.div>
            )}

            {uploadState === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-3 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Téléchargement en cours...</span>
                </div>
              </motion.div>
            )}

            {(uploadState === 'idle' || uploadState === 'uploaded') && (
              <motion.div
                key="upload-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full",
                    uploadState === 'uploaded' && "border-primary/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadState === 'uploaded' ? 'Changer le document' : 'Télécharger un document'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploadState === 'uploading'}
            className="hidden"
          />

          {/* Tips section */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
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
