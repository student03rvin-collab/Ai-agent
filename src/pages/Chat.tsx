import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Brain, LogOut, Upload, FileText, MessageSquare, Home, Plus } from "lucide-react";
import { toast } from "sonner";
import ChatInterface from "@/components/chat/ChatInterface";
import DocumentUpload from "@/components/document/DocumentUpload";
import DocumentList from "@/components/document/DocumentList";
import ConversationHistory from "@/components/chat/ConversationHistory";
import { Card } from "@/components/ui/card";

const Chat = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"chat" | "documents" | "upload">("chat");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setSelectedConversationId(null);
    setActiveView("chat");
  };

  const handleNewChat = () => {
    setSelectedConversationId(null);
    setSelectedDocumentId(null);
  };

  const handleSelectConversation = (conversationId: string, documentId: string | null) => {
    if (!documentId) {
      navigate("/general-chat");
    } else {
      setSelectedConversationId(conversationId);
      setSelectedDocumentId(documentId);
      setActiveView("chat");
    }
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
            <h1 className="text-2xl font-bold gradient-text">Document Chat</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/general-chat")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              General Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("chat")}
              className={activeView === "chat" ? "bg-primary/20" : ""}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("documents")}
              className={activeView === "documents" ? "bg-primary/20" : ""}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView("upload")}
              className={activeView === "upload" ? "bg-primary/20" : ""}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {activeView === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            <div className="lg:col-span-1">
              <div className="mb-4">
                <Button
                  onClick={handleNewChat}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </div>
              <ConversationHistory
                userId={user!.id}
                onSelectConversation={handleSelectConversation}
                currentConversationId={selectedConversationId}
              />
            </div>
            <div className="lg:col-span-3">
              <ChatInterface 
                userId={user!.id} 
                documentId={selectedDocumentId}
                conversationId={selectedConversationId}
                onConversationCreated={setSelectedConversationId}
              />
            </div>
          </div>
        )}

        {activeView === "documents" && (
          <div className="max-w-4xl mx-auto animate-slide-up">
            <Card className="glass border-primary/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Your Documents</h2>
              </div>
              <DocumentList onSelectDocument={handleDocumentSelect} />
            </Card>
          </div>
        )}

        {activeView === "upload" && (
          <div className="max-w-2xl mx-auto animate-slide-up">
            <Card className="glass border-primary/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Upload className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Upload Document</h2>
              </div>
              <DocumentUpload 
                userId={user!.id} 
                onUploadComplete={() => setActiveView("documents")}
              />
            </Card>
          </div>
        )}
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

export default Chat;
