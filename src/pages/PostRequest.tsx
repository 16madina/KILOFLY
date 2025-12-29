import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { CreateTransportRequestForm } from "@/components/transport-requests/CreateTransportRequestForm";

const PostRequest = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate("/?tab=requests");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-32">
        <Button
          variant="ghost"
          onClick={() => navigate("/post")}
          className="mb-6 -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Publier une demande de transport</CardTitle>
            <CardDescription>
              Décrivez ce que vous souhaitez envoyer et les voyageurs pourront vous proposer leurs services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTransportRequestForm onSuccess={handleSuccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostRequest;
