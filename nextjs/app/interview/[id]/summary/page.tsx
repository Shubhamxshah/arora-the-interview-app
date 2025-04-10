// app/interviews/[id]/summary/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Download, Share } from "lucide-react";
import { toast } from "sonner";

interface SummaryPageProps {
  params: {
    id: string;
  };
}

interface InterviewSummary {
  id: string;
  candidateEmail: string;
  processingState: string;
  candidateVideoUrl: string;
  candidateTranscript: string;
  interviewSummary: string;
  questions: string[];
  completedAt: string;
}

export default function SummaryPage({ params }: SummaryPageProps) {
  const { id } = params;
  const router = useRouter();
  
  const [interview, setInterview] = useState<InterviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/interviews/${id}/summary`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load interview summary");
        }
        
        const data = await response.json();
        setInterview(data.interview);
      } catch (err: any) {
        console.error("Error fetching interview summary:", err);
        setError(err.message || "Failed to load interview summary");
        toast.error( err.message || "Failed to load interview summary");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSummary();
  }, [id]);
  
  const handleDownloadTranscript = () => {
    if (!interview?.candidateTranscript) return;
    
    const element = document.createElement('a');
    const file = new Blob([interview.candidateTranscript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `interview_transcript_${interview.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const handleDownloadSummary = () => {
    if (!interview?.interviewSummary) return;
    
    const element = document.createElement('a');
    const file = new Blob([interview.interviewSummary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `interview_summary_${interview.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const handleShareSummary = async () => {
    if (!interview) return;
    
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/interviews/${interview.id}/summary`
      );
      
      toast.success("Summary link copied to clipboard");
    } catch (err) {
      toast.success("Failed to copy link");
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading summary...</span>
        </div>
      </div>
    );
  }
  
  if (error || !interview) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Failed to load interview summary"}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Interview Summary</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-500">Candidate</h3>
                <p>{interview.candidateEmail}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-500">Completed At</h3>
                <p>{new Date(interview.completedAt).toLocaleString()}</p>
              </div>
              
              <div>
<h3 className="font-medium text-gray-500">Questions</h3>
                <ul className="space-y-2 mt-2">
                  {interview.questions.map((question, index) => (
                    <li key={index} className="text-sm">
                      <span className="font-medium">{index + 1}.</span> {question}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="pt-4 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleDownloadTranscript}
                >
                  <Download className="h-4 w-4 mr-2" /> Download Transcript
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleDownloadSummary}
                >
                  <Download className="h-4 w-4 mr-2" /> Download Summary
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleShareSummary}
                >
                  <Share className="h-4 w-4 mr-2" /> Share Summary
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="summary">
            <TabsList className="mb-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none whitespace-pre-wrap">
                    {interview.interviewSummary}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="transcript">
              <Card>
                <CardHeader>
                  <CardTitle>Full Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none whitespace-pre-wrap">
                    {interview.candidateTranscript}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="video">
              <Card>
                <CardHeader>
                  <CardTitle>Interview Recording</CardTitle>
                </CardHeader>
                <CardContent>
                  {interview.candidateVideoUrl ? (
                    <div className="aspect-video">
                      <video 
                        src={interview.candidateVideoUrl}
                        controls
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Video recording not available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
