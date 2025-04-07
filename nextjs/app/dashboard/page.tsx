// app/page.tsx
'use client'

import { useState, useEffect } from "react";
import { Search, Clock, Mail, Briefcase, User, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import { createInterview } from "@/app/actions/interviewActions";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Interview, ProcessingState } from '@prisma/client';
import Image from "next/image";

// Register FilePond plugins
registerPlugin(FilePondPluginFileValidateType);

interface Avatar {
  avatar_id: string;
  title?: string;
  thumbnail?: string;
  status: string;
}

export default function Page() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [timestamp, setTimestamp] = useState("00:00:00");
  const [jobDescription, setJobDescription] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [currentStep, setCurrentStep] = useState("select-avatar");
  const [resumeText, setResumeText] = useState("");
  const [pond, setPond] = useState<any>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch avatars when dialog opens
  const fetchAvatars = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/avatars/list');
      const data = await response.json();
      setAvatars(data.avatars || []);
    } catch (error) {
      console.error("Error fetching avatars:", error);
      toast.error("Failed to fetch avatars. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch interviews on component mount and periodically
  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews/list');
      const data = await response.json();
      setInterviews(data.interviews || []);
    } catch (error) {
      console.error("Error fetching interviews:", error);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchInterviews();
    
    // Set up polling for interview updates every 30 seconds
    const intervalId = setInterval(fetchInterviews, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      fetchAvatars();
      setCurrentStep("select-avatar");
      setSelectedAvatar(null);
      setResumeText("");
      setJobDescription("");
      setCandidateEmail("");
      setTimestamp("00:00:00");
      if (pond) {
        pond.removeFiles();
      }
    }
  };

  const validateTimestamp = (value: string) => {
    // Basic validation for timestamp format (HH:MM:SS)
    const pattern = /^([0-5]\d|[0-9]):([0-5]\d):([0-5]\d)$/;
    if (pattern.test(value) || value === "") {
      setTimestamp(value);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAvatar || !resumeText || !jobDescription || !candidateEmail || !timestamp) {
      toast.error("Please complete all fields before submitting");
      return;
    }

    if (!session?.user?.email) {
      toast.error("You must be logged in to create interviews");
      return;
    }

    setIsLoading(true);
    try {
      // Create interview using server action
      const result = await createInterview({
        avatarId: selectedAvatar.avatar_id,
        resumeText,
        jobDescription,
        candidateEmail,
        timestamp,
        creatorEmail: session.user.email
      });

      if (result.success) {
        toast("Interview creation process has started. You'll be notified when it's ready");
        
        // Refresh interviews list
        await fetchInterviews();
        
        // Close dialog
        setIsDialogOpen(false);
      } else {
        throw new Error(result.error || "Failed to create interview");
      }
    } catch (error: any) {
      console.error("Error creating interview invite:", error);
      toast("Failed to create interview invite");
    } finally {
      setIsLoading(false);
    }
  };

  const getProcessingStateLabel = (state: ProcessingState): { text: string; color: string } => {
    switch (state) {
      case 'CREATING_QUESTIONS':
        return { text: 'Creating Questions', color: 'bg-blue-100 text-blue-700' };
      case 'GENERATING_VIDEOS':
        return { text: 'Generating Videos', color: 'bg-blue-100 text-blue-700' };
      case 'PROCESSING_VIDEOS':
        return { text: 'Processing Videos', color: 'bg-blue-100 text-blue-700' };
      case 'MERGING_VIDEOS':
        return { text: 'Merging Videos', color: 'bg-blue-100 text-blue-700' };
      case 'UPLOADING_VIDEO':
        return { text: 'Uploading Video', color: 'bg-blue-100 text-blue-700' };
      case 'READY_FOR_CANDIDATE':
        return { text: 'Ready for Candidate', color: 'bg-purple-100 text-purple-700' };
      case 'WAITING_FOR_CANDIDATE':
        return { text: 'Waiting for Candidate', color: 'bg-yellow-100 text-yellow-700' };
      case 'CANDIDATE_COMPLETED':
        return { text: 'Candidate Completed', color: 'bg-orange-100 text-orange-700' };
      case 'PROCESSING_CANDIDATE_VIDEO':
        return { text: 'Processing Recording', color: 'bg-orange-100 text-orange-700' };
      case 'GENERATING_SUMMARY':
        return { text: 'Generating Summary', color: 'bg-orange-100 text-orange-700' };
      case 'COMPLETED':
        return { text: 'Completed', color: 'bg-green-100 text-green-700' };
      case 'FAILED':
        return { text: 'Failed', color: 'bg-red-100 text-red-700' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const sendInterviewEmail = async (interviewId: string) => {
    try {
      const response = await fetch(`/api/interviews/${interviewId}/send-email`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      toast.success("Interview invitation has been sent to the candidate");
      
      // Refresh interviews
      fetchInterviews();
    } catch (error) {
      toast.error("Failed to send email. Please try again.");
    }
  };

  const viewInterviewSummary = (interview: Interview) => {
    if (interview.interviewSummary) {
      router.push(`/interviews/${interview.id}/summary`);
    } else {
      toast.error("The interview summary is not yet available");
    }
  };

  const filteredInterviews = interviews.filter(interview => 
    interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avatarTabs = [
    { value: "select-avatar", label: "1. Select Avatar" },
    { value: "provide-details", label: "2. Interview Details" },
    { value: "review", label: "3. Review & Submit" }
  ];

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex flex-1 justify-between items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 h-9" />
          <div className="flex">
            <Input
              className="w-xl"
              type="search"
              placeholder="search invites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="bg-muted relative right-10 rounded-tr-md rounded-br-md h-9 w-10" />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="mr-6">
                Create Interview Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Interview Invite</DialogTitle>
                <DialogDescription>
                  Create an automated AI interview by selecting an avatar and providing candidate details.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  {avatarTabs.map(tab => (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      disabled={isLoading}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                <TabsContent value="select-avatar">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Select an Avatar</h3>
                    
                    {isLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {avatars.map((avatar) => (
                          <Card 
                            key={avatar.avatar_id} 
                            className={`cursor-pointer transition-all ${selectedAvatar?.avatar_id === avatar.avatar_id ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => setSelectedAvatar(avatar)}
                          >
                            <CardContent className="p-4 flex flex-col items-center">
                              {avatar.thumbnail ? (
                                <Image 
                                  src={avatar.thumbnail} 
                                  alt={avatar.title || "Avatar"}
                                  height="100"
                                  width="100"
                                  className="w-full aspect-video object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-md">
                                  <User className="h-12 w-12 opacity-50" />
                                </div>
                              )}
                              <p className="mt-2 text-sm font-medium truncate w-full text-center">
                                {avatar.title || `Avatar ${avatar.avatar_id.slice(0, 8)}`}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {avatars.length === 0 && !isLoading && (
                          <div className="col-span-3 p-8 text-center text-muted-foreground">
                            No avatars available. Please check your API key.
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        disabled={!selectedAvatar || isLoading}
                        onClick={() => setCurrentStep("provide-details")}
                      >
                        Next: Interview Details
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="provide-details">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Interview Details</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label htmlFor="resumeUpload" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Candidate Resume (PDF)
                          </Label>
                          <div className="mt-1">
                            <FilePond
                              ref={(ref: any) => setPond(ref)}
                              allowMultiple={false}
                              acceptedFileTypes={['application/pdf']}
                              labelIdle='Drag & Drop resume or <span class="filepond--label-action">Browse</span>'
                              name="filepond"
                              server={{
                                process: {
                                  url: '/api/upload',
                                  method: 'POST',
                                  withCredentials: false,
                                  onload: (response: string) => {
                                    console.log("upload response", response)
                                    setResumeText(JSON.parse(response));
                                    return response;
                                  },
                                  onerror: (error: any) => {
                                    toast.error( "Failed to parse resume. Please try another file.");
                                    return error;
                                  }
                                }, 
                                fetch: null, 
                                revert: null, 
                              }}
                              onremovefile={() => {
                                setResumeText("");
                              }}
                            />
                            {resumeText && (
                              <div className="mt-2 p-2 bg-muted rounded-md">
                                <span className="text-xs text-green-500">
                                  Resume successfully parsed! ({resumeText.length} characters)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="jobDescription" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Job Description
                          </Label>
                          <Textarea
                            id="jobDescription"
                            placeholder="Enter the job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="mt-1 min-h-32"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="timestamp" className="flex items-center gap-2">
                              <Clock className="h-4 w-4" /> Nodding Clip Timestamp (HH:MM:SS)
                            </Label>
                            <Input
                              id="timestamp"
                              type="text"
                              placeholder="00:00:00"
                              value={timestamp}
                              onChange={(e) => validateTimestamp(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="candidateEmail" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" /> Candidate Email
                            </Label>
                            <Input
                              id="candidateEmail"
                              type="email"
                              placeholder="candidate@example.com"
                              value={candidateEmail}
                              onChange={(e) => setCandidateEmail(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep("select-avatar")}
                        disabled={isLoading}
                      >
                        Back: Select Avatar
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep("review")}
                        disabled={!resumeText || !jobDescription || !candidateEmail || !timestamp || isLoading}
                      >
                        Next: Review
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="review">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Review Interview Invite</h3>
                    
                    <div className="space-y-4 rounded-md border p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Selected Avatar</h4>
                          <p className="text-sm">{selectedAvatar?.title || selectedAvatar?.avatar_id.slice(0, 8)}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Resume</h4>
                          <p className="text-sm">PDF parsed ({resumeText?.length} characters)</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Candidate Email</h4>
                          <p className="text-sm">{candidateEmail}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Nodding Clip Timestamp</h4>
                          <p className="text-sm">{timestamp}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Job Description</h4>
                        <p className="text-sm whitespace-pre-wrap">{jobDescription}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Process Steps</h4>
                        <ul className="text-sm list-disc list-inside">
                          <li>Generate 5 interview questions using Groq AI</li>
                          <li>Create avatar videos for each question</li>
                          <li>Extract nodding clip from timestamp</li>
                          <li>Merge videos with nodding clips in between</li>
                          <li>Upload final video to Cloudinary</li>
                          <li>Send email notification to candidate</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep("provide-details")}
                        disabled={isLoading}
                      >
                        Back: Interview Details
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Create Interview Invite"
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h2 className="text-2xl font-semibold">Interview Invites</h2>
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {filteredInterviews.length > 0 ? (
            filteredInterviews.map(interview => (
              <Card key={interview.id} className="overflow-hidden">
                <div className="aspect-video bg-muted">
                  {interview.interviewVideoUrl ? (
                    <video 
                      src={interview.interviewVideoUrl} 
                      poster={interview.interviewThumbnailUrl || undefined}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium">{interview.candidateEmail}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created: {new Date(interview.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      getProcessingStateLabel(interview.processingState).color
                    }`}>
                      {getProcessingStateLabel(interview.processingState).text}
                    </span>
                    
                    <div className="flex gap-2">
                      {interview.processingState === 'READY_FOR_CANDIDATE' && !interview.emailSent && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => sendInterviewEmail(interview.id)}
                        >
                          Send Email
                        </Button>
                      )}
                      
                      {interview.processingState === 'COMPLETED' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewInterviewSummary(interview)}
                        >
                          View Summary
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center text-muted-foreground">
              No interview invites found. Create a new invite to get started.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
