import { useState } from "react";
import { Ban, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BlockUserDialogProps {
  userId: string;
  userName: string;
  isBlocked?: boolean;
  onBlockChange?: () => void;
}

export const BlockUserDialog = ({ 
  userId, 
  userName, 
  isBlocked = false,
  onBlockChange 
}: BlockUserDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: user.id,
      blocked_id: userId,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de bloquer cet utilisateur",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Utilisateur bloqué",
      description: `${userName} ne pourra plus vous contacter`,
    });

    onBlockChange?.();
  };

  const handleUnblock = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de débloquer cet utilisateur",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Utilisateur débloqué",
      description: `${userName} peut à nouveau vous contacter`,
    });

    onBlockChange?.();
  };

  if (isBlocked) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserX className="w-4 h-4 mr-2" />
            Débloquer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débloquer {userName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cet utilisateur pourra à nouveau voir vos annonces et vous contacter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={loading}>
              {loading ? "Débloquage..." : "Débloquer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Ban className="w-4 h-4 mr-2" />
          Bloquer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bloquer {userName} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cet utilisateur ne pourra plus vous contacter ni voir vos annonces.
            Vous ne verrez plus ses annonces non plus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleBlock} disabled={loading}>
            {loading ? "Blocage..." : "Bloquer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
