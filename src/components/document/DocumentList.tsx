import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, MessageSquare, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  summary: string | null;
  sentiment: string | null;
  key_points: string[] | null;
  created_at: string;
}

interface DocumentListProps {
  onSelectDocument: (documentId: string) => void;
}

const DocumentList = ({ onSelectDocument }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;

      toast.success("Document deleted");
      loadDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <FileText className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
        <p className="text-muted-foreground">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="glass border-primary/20 p-6 hover:border-primary/40 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                </div>
              </div>

              {doc.summary && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {doc.summary}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {doc.sentiment && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-secondary" />
                    <span className="text-muted-foreground">
                      Sentiment: <span className="text-foreground">{doc.sentiment}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {doc.key_points && doc.key_points.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Key Points:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {doc.key_points.slice(0, 3).map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={() => onSelectDocument(doc.id)}
                className="bg-primary hover:bg-primary/90"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(doc.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DocumentList;
