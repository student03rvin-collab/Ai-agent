import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  userId: string;
  documentId: string | null;
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
}

const ChatInterface = ({ 
  userId, 
  documentId, 
  conversationId: externalConversationId,
  onConversationCreated 
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(externalConversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalConversationId) {
      loadExistingConversation(externalConversationId);
    } else {
      initializeConversation();
    }
  }, [documentId, externalConversationId]);

  const loadExistingConversation = async (convId: string) => {
    try {
      setConversationId(convId);

      const { data: existingMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Failed to load conversation history");
        toast.error("Unable to load chat history. Please refresh the page.");
        return;
      }

      setMessages((existingMessages || []) as Message[]);
    } catch (error: any) {
      console.error("Failed to load conversation");
      toast.error("Unable to load conversation. Please try again.");
    }
  };

  const initializeConversation = async () => {
    try {
      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          document_id: documentId,
          title: documentId ? "Document Chat" : "New Chat",
        })
        .select()
        .single();

      if (convError) {
        console.error("Failed to initialize conversation");
        toast.error("Unable to start conversation. Please try again.");
        return;
      }

      setConversationId(conversation.id);
      onConversationCreated?.(conversation.id);
      setMessages([]);
    } catch (error: any) {
      console.error("Conversation initialization failed");
      toast.error("Unable to start chat session. Please refresh the page.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Save user message
      const { data: userMsg, error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
        })
        .select()
        .single();

      if (userMsgError) {
        console.error("Failed to save message");
        toast.error("Unable to send message. Please try again.");
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, userMsg as Message]);

      // Call AI edge function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("chat", {
        body: {
          message: userMessage,
          conversationId,
          documentId,
        },
      });

      if (aiError) {
        console.error("AI request failed");
        toast.error("Unable to get AI response. Please try again.");
        setLoading(false);
        return;
      }

      // Save AI response
      const { data: aiMsg, error: aiMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: aiResponse.response,
        })
        .select()
        .single();

      if (aiMsgError) {
        console.error("Failed to save AI response");
        toast.error("Response received but couldn't be saved. Please refresh.");
      }

      setMessages((prev) => [...prev, aiMsg as Message]);
    } catch (error: any) {
      console.error("Message send failed");
      toast.error("Unable to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col glass rounded-lg border border-primary/20 animate-slide-up">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <Sparkles className="w-16 h-16 text-primary animate-glow" />
            <div>
              <h3 className="text-2xl font-bold gradient-text mb-2">
                {documentId ? "Chat with Your Document" : "Start a Conversation"}
              </h3>
              <p className="text-muted-foreground">
                {documentId 
                  ? "Ask questions about your uploaded document"
                  : "Ask me anything or upload a document to analyze"}
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user"
                  ? "bg-primary"
                  : "bg-accent"
              }`}
            >
              {message.role === "user" ? (
                <UserIcon className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Bot className="w-5 h-5 text-accent-foreground" />
              )}
            </div>

            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <Bot className="w-5 h-5 text-accent-foreground animate-pulse" />
            </div>
            <Card className="p-4 bg-card border-border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-primary/20 p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none bg-background/50 border-primary/20 focus:border-primary"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px] bg-primary hover:bg-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
