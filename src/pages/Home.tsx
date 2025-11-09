import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, FileText, MessageSquare, LogOut } from "lucide-react";
import { toast } from "sonner";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Brain className="w-16 h-16 text-primary animate-float" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="glass border-b border-primary/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">AI Document Assistant</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-16 relative z-10 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Welcome back, {user?.user_metadata?.full_name || 'there'}!
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose how you'd like to start
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Document Chat Card */}
            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105 cursor-pointer group"
                  onClick={() => navigate("/document-chat")}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Document Chat</h3>
                <p className="text-muted-foreground">
                  Upload and analyze documents with AI assistance. Ask questions about your files and get intelligent insights.
                </p>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Start Document Chat
                </Button>
              </div>
            </Card>

            {/* General Chat Card */}
            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105 cursor-pointer group"
                  onClick={() => navigate("/general-chat")}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <MessageSquare className="w-12 h-12 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">General Chat</h3>
                <p className="text-muted-foreground">
                  Have a conversation with AI about anything. Get answers, brainstorm ideas, or just chat.
                </p>
                <Button className="w-full bg-accent hover:bg-accent/90">
                  Start General Chat
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass border-t border-primary/20 py-4 backdrop-blur-xl">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Secure • Fast</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
