import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  userId: string;
  onUploadComplete: () => void;
}

const DocumentUpload = ({ userId, onUploadComplete }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // File signature validation (magic numbers)
  const validateFileSignature = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 8);
        let header = "";
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16).padStart(2, "0");
        }

        // File signatures (magic numbers)
        const signatures: { [key: string]: string[] } = {
          pdf: ["25504446"], // %PDF
          docx: ["504b0304", "504b0506", "504b0708"], // PK (ZIP-based)
          txt: [], // Plain text has no signature
          csv: [], // CSV has no signature
        };

        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        
        // Allow text and CSV without signature check
        if (extension === "txt" || extension === "csv") {
          resolve(true);
          return;
        }

        // Check if file signature matches expected type
        const expectedSignatures = signatures[extension] || [];
        const isValid = expectedSignatures.some((sig) => header.startsWith(sig));
        
        resolve(isValid);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 8));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file extension
    const allowedExtensions = ["pdf", "docx", "txt", "csv"];
    const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    
    if (!allowedExtensions.includes(extension)) {
      toast.error("Invalid file type. Only PDF, DOCX, TXT, and CSV files are allowed");
      e.target.value = "";
      return;
    }

    // Validate MIME type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
      "application/octet-stream", // Some systems report DOCX as this
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type detected. Please upload a valid document");
      e.target.value = "";
      return;
    }

    // Validate file size
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      e.target.value = "";
      return;
    }

    // Validate file signature for binary files
    if (extension === "pdf" || extension === "docx") {
      const isValidSignature = await validateFileSignature(selectedFile);
      if (!isValidSignature) {
        toast.error("File appears to be corrupted or is not a valid " + extension.toUpperCase() + " file");
        e.target.value = "";
        return;
      }
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      // Read file content based on file type
      const reader = new FileReader();
      reader.onload = async (e) => {
        let content: string;
        
        // For binary files (PDF, DOCX), convert to base64
        // For text files, read as text
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        
        if (extension === "pdf" || extension === "docx") {
          // Convert ArrayBuffer to base64 for binary files
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          content = btoa(binary);
        } else {
          // Read as text for TXT and CSV
          content = e.target?.result as string;
        }

        // Create document record
        const { data: document, error: docError } = await supabase
          .from("documents")
          .insert({
            user_id: userId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            content: content,
            status: "processing",
          })
          .select()
          .single();

        if (docError) {
          console.error("Upload failed:", docError.message);
          toast.error("Unable to upload document. Please try again.");
          setUploading(false);
          return;
        }

        toast.success("Document uploaded! Analyzing content...");

        // Call edge function to analyze document
        const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke("analyze-document", {
          body: {
            documentId: document.id,
            content: content,
          },
        });

        if (analyzeError) {
          console.error("Analysis failed:", analyzeError.message);
          toast.warning("Document uploaded but analysis failed. You can still chat about it!");
        } else {
          toast.success("Document analyzed successfully! Ready to chat.");
        }

        setFile(null);
        onUploadComplete();
      };

      reader.onerror = () => {
        console.error("File read failed");
        toast.error("Failed to read file. Please try again.");
        setUploading(false);
      };

      // Use appropriate reader based on file type
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      if (extension === "pdf" || extension === "docx") {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error: any) {
      console.error("Upload process failed:", error.message);
      toast.error("Unable to process document. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="file" className="text-foreground">
          Select Document
        </Label>
        <div className="relative">
          <Input
            id="file"
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleFileChange}
            className="bg-background/50 border-primary/20 focus:border-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Supported formats: PDF, DOCX, TXT, CSV (Max 10MB)
        </p>
      </div>

      {file && (
        <div className="glass p-4 rounded-lg border border-primary/20 flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload & Analyze
          </>
        )}
      </Button>
    </div>
  );
};

export default DocumentUpload;
