import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationHistoryProps {
  userId: string;
  onSelectConversation: (conversationId: string, documentId: string | null) => void;
  currentConversationId: string | null;
}

const ConversationHistory = ({ 
  userId, 
  onSelectConversation, 
  currentConversationId 
}: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setConversations(data || []);
    } catch (error) {
      console.error("Failed to load conversations");
      toast.error("Unable to load conversation history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation");
      toast.error("Unable to delete conversation");
    }
  };

  if (loading) {
    return (
      <Card className="glass border-primary/20 p-4">
        <p className="text-sm text-muted-foreground">Loading history...</p>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/20">
      <div className="p-4 border-b border-primary/20">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent Conversations
        </h3>
      </div>
      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="p-2 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <Button
                key={conv.id}
                variant={currentConversationId === conv.id ? "secondary" : "ghost"}
                className="w-full justify-start text-left h-auto py-3 px-3"
                onClick={() => onSelectConversation(conv.id, conv.document_id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-1">
                    {conv.document_id ? (
                      <FileText className="w-4 h-4 text-primary" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-destructive"
                    onClick={(e) => handleDelete(conv.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ConversationHistory;