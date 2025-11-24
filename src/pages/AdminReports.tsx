import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: {
    full_name: string;
    avatar_url: string;
  };
  reported: {
    full_name: string;
    avatar_url: string;
  };
}

const AdminReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndFetchReports();
  }, []);

  const checkAdminAndFetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions nécessaires",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    await fetchReports();
  };

  const fetchReports = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("reports")
      .select(`
        id,
        reason,
        description,
        status,
        created_at,
        reporter:reporter_id (
          full_name,
          avatar_url
        ),
        reported:reported_id (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les signalements",
        variant: "destructive",
      });
      return;
    }

    setReports(data as any);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le signalement",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Statut mis à jour",
      description: `Le signalement a été marqué comme ${newStatus}`,
    });

    fetchReports();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "resolved":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Résolu</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      spam: "Spam ou contenu trompeur",
      inappropriate: "Contenu inapproprié",
      scam: "Tentative d'arnaque",
      harassment: "Harcèlement",
      other: "Autre",
    };
    return labels[reason] || reason;
  };

  const filterReports = (status?: string) => {
    if (!status) return reports;
    return reports.filter((r) => r.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Gestion des signalements</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les signalements des utilisateurs
          </p>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Tous ({reports.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente ({filterReports("pending").length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Résolus ({filterReports("resolved").length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejetés ({filterReports("rejected").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdateStatus={updateReportStatus}
                getStatusBadge={getStatusBadge}
                getReasonLabel={getReasonLabel}
              />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filterReports("pending").map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdateStatus={updateReportStatus}
                getStatusBadge={getStatusBadge}
                getReasonLabel={getReasonLabel}
              />
            ))}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {filterReports("resolved").map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdateStatus={updateReportStatus}
                getStatusBadge={getStatusBadge}
                getReasonLabel={getReasonLabel}
              />
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {filterReports("rejected").map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdateStatus={updateReportStatus}
                getStatusBadge={getStatusBadge}
                getReasonLabel={getReasonLabel}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ReportCard = ({ 
  report, 
  onUpdateStatus, 
  getStatusBadge, 
  getReasonLabel 
}: { 
  report: Report;
  onUpdateStatus: (id: string, status: string) => void;
  getStatusBadge: (status: string) => JSX.Element;
  getReasonLabel: (reason: string) => string;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{getReasonLabel(report.reason)}</CardTitle>
          <CardDescription>
            Signalé le {new Date(report.created_at).toLocaleDateString("fr-FR")}
          </CardDescription>
        </div>
        {getStatusBadge(report.status)}
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium mb-2">Signalé par</p>
          <div className="flex items-center gap-2">
            <img
              src={report.reporter.avatar_url || "/placeholder.svg"}
              alt={report.reporter.full_name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm">{report.reporter.full_name}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Utilisateur signalé</p>
          <div className="flex items-center gap-2">
            <img
              src={report.reported.avatar_url || "/placeholder.svg"}
              alt={report.reported.full_name}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm">{report.reported.full_name}</span>
          </div>
        </div>
      </div>

      {report.description && (
        <div>
          <p className="text-sm font-medium mb-1">Description</p>
          <p className="text-sm text-muted-foreground">{report.description}</p>
        </div>
      )}

      {report.status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onUpdateStatus(report.id, "resolved")}
            className="flex-1"
          >
            Marquer comme résolu
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(report.id, "rejected")}
            className="flex-1"
          >
            Rejeter
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminReports;
