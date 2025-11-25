import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Eye, 
  MapPin, 
  Calendar,
  Package,
  DollarSign,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Listing {
  id: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  available_kg: number;
  price_per_kg: number;
  status: string;
  description: string | null;
  destination_image: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const AdminListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    filterListings();
  }, [searchQuery, statusFilter, listings]);

  const checkAdminRole = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      toast.error("Accès refusé: Réservé aux administrateurs");
      navigate('/');
      return;
    }

    setIsAdmin(true);
    fetchListings();
  };

  const fetchListings = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des annonces");
      console.error(error);
      setLoading(false);
      return;
    }

    setListings(data || []);
    setFilteredListings(data || []);
    setLoading(false);
  };

  const filterListings = () => {
    let filtered = [...listings];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.departure.toLowerCase().includes(query) ||
        l.arrival.toLowerCase().includes(query) ||
        l.profiles.full_name.toLowerCase().includes(query)
      );
    }

    setFilteredListings(filtered);
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;

    setProcessing(true);

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', selectedListing.id);

    if (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
      setProcessing(false);
      return;
    }

    // Notify the user
    await supabase.rpc('send_notification', {
      p_user_id: selectedListing.user_id,
      p_title: "🗑️ Annonce supprimée",
      p_message: "Votre annonce a été supprimée par un administrateur pour non-respect des règles de la plateforme.",
      p_type: 'error'
    });

    toast.success("Annonce supprimée et utilisateur notifié");
    setDeleteDialog(false);
    setProcessing(false);
    fetchListings();
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestion des Annonces</h1>
          <p className="text-muted-foreground">
            {filteredListings.length} annonce(s)
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par départ, arrivée, ou nom d'utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="completed">Complété</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings */}
        <div className="grid gap-4">
          {filteredListings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="py-6">
                <div className="flex gap-4">
                  {listing.destination_image && (
                    <img
                      src={listing.destination_image}
                      alt={listing.arrival}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={listing.profiles.avatar_url} />
                        <AvatarFallback>
                          {listing.profiles.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{listing.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(listing.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge 
                        variant={listing.status === 'active' ? 'default' : 'secondary'}
                        className="ml-auto"
                      >
                        {listing.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{listing.departure}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{listing.arrival}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(listing.departure_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.available_kg} kg disponibles</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.price_per_kg} $ / kg</span>
                      </div>
                    </div>

                    {listing.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {listing.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedListing(listing);
                        setDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. L'utilisateur sera notifié de la suppression.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteListing}
                disabled={processing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {processing ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminListings;
