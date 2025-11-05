import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, FileText, MessageSquare, Sparkles, TrendingUp, Zap, Shield, Rocket } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/general-chat");
    } else {
      navigate("/auth");
    }
  };

  const handleDocumentChat = () => {
    if (isAuthenticated) {
      navigate("/document-chat");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <Brain className="w-24 h-24 text-primary animate-float" />
              <Sparkles className="w-10 h-10 text-secondary absolute -top-4 -right-4 animate-glow" />
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-tight">
            Intelligent NLP Agent
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered document analysis and chatbot. Upload your documents, get instant insights, and chat intelligently with your content.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Start General Chat
              </span>
              <div className="absolute inset-0 bg-gradient-ai opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>

            <Button
              size="lg"
              onClick={handleDocumentChat}
              className="bg-accent hover:bg-accent/90 text-lg px-8 py-6 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Analyze Documents
              </span>
              <div className="absolute inset-0 bg-gradient-ai opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>

            {!isAuthenticated && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 border-primary/30 hover:border-primary"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 gradient-text">
            Powerful AI Features
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Document Analysis</h3>
              <p className="text-muted-foreground">
                Upload PDF, DOCX, TXT, or CSV files. Get instant summaries, key insights, sentiment analysis, and entity extraction.
              </p>
            </Card>

            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Intelligent Chat</h3>
              <p className="text-muted-foreground">
                Chat with your documents using advanced AI. Ask questions, get summaries, and explore content naturally.
              </p>
            </Card>

            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Smart Insights</h3>
              <p className="text-muted-foreground">
                Extract keywords, detect sentiment, identify entities, and discover key points automatically with AI.
              </p>
            </Card>

            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Powered by state-of-the-art GPT models and optimized processing for instant results.
              </p>
            </Card>

            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Secure & Private</h3>
              <p className="text-muted-foreground">
                Your documents are encrypted and stored securely. We prioritize your data privacy and security.
              </p>
            </Card>

            <Card className="glass border-primary/20 p-8 hover:border-primary/40 transition-all hover:scale-105">
              <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-6">
                <Brain className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Context-Aware</h3>
              <p className="text-muted-foreground">
                Multi-turn conversations with memory. The AI understands context and provides accurate, relevant responses.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 py-20">
        <Card className="glass border-primary/20 p-12 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Ready to Transform Your Documents?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who are leveraging AI to understand their documents better.
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="bg-primary hover:bg-primary/90 text-lg px-10 py-6"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Analyzing Now
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass border-t border-primary/20 py-8 backdrop-blur-xl">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Document Assistant. Powered by Advanced NLP Technology.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
