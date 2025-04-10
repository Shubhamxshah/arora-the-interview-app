'use client'

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PdfUploader({ onTextExtracted }: { onTextExtracted: (text: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept PDFs
    if (file.type !== 'application/pdf') {
      toast.error( "Invalid file type, Please upload a PDF file");
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Get the extracted text
      const extractedText = await response.text();
      
      // Call the callback with the extracted text
      onTextExtracted(extractedText);
      
      toast.success("Resume uploaded and parsed successfully");
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error("Could not upload and parse the PDF");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Resume (PDF)'}
        </Button>
        
        {fileName && (
          <span className="text-sm text-green-600">
            {fileName}
          </span>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="application/pdf"
          className="hidden"
        />
      </div>
    </div>
  );
}
