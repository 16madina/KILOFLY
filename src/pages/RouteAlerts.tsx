import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Bell, Plus, Trash2, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RouteAlerts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('route_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!departure.trim() || !arrival.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('route_alerts')
        .insert({
          user_id: user?.id,
          departure: departure.trim(),
          arrival: arrival.trim(),
          active: true,
        });

      if (error) throw error;

      toast.success('Alerte créée avec succès');
      setDeparture('');
      setArrival('');
      setShowForm(false);
      fetchAlerts();
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error('Erreur lors de la création de l\'alerte');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('route_alerts')
        .update({ active: !currentStatus })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, active: !currentStatus } : alert
      ));
      
      toast.success(!currentStatus ? 'Alerte activée' : 'Alerte désactivée');
    } catch (error: any) {
      console.error('Error toggling alert:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('route_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast.success('Alerte supprimée');
    } catch (error: any) {
      console.error('Error deleting alert:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-32 mb-safe">
      {/* Header with safe area */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50 pt-safe">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Alertes de Routes</h1>
              <p className="text-sm text-muted-foreground">
                Recevez des notifications pour vos routes favorites
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Add Alert Button */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Créer une nouvelle alerte
          </Button>
        )}

        {/* Create Alert Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div>
                  <Label htmlFor="departure">Départ</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="departure"
                      placeholder="Paris"
                      value={departure}
                      onChange={(e) => setDeparture(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="arrival">Arrivée</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="arrival"
                      placeholder="Abidjan"
                      value={arrival}
                      onChange={(e) => setArrival(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création...
                      </>
                    ) : (
                      'Créer l\'alerte'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setDeparture('');
                      setArrival('');
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Alerts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Aucune alerte</h2>
            <p className="text-muted-foreground">
              Créez une alerte pour recevoir des notifications
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{alert.departure}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold">{alert.arrival}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Créée le {new Date(alert.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alert.active}
                        onCheckedChange={() => handleToggleAlert(alert.id, alert.active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}