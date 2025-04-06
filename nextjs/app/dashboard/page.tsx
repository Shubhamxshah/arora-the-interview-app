'use client'

import { useState, useRef } from "react";
import { Search, Upload, Clock, Mail, Briefcase, User, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import axios from "axios";

interface AvatarObject {
  avatar_id: string;
  title: string;
  thumbnail: string;
  status: string;
  base_video: string;
  avatar_webhook?: {
    webhook_url: string;
  }; 
  created_at: string;
}

interface APIResponse {
  total_avatars: number;
  avatars_list: AvatarObject[];
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

export default function Page() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatars, setAvatars] = useState<AvatarObject[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [timestamp, setTimestamp] = useState("00:00:00");
  const [jobDescription, setJobDescription] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [currentStep, setCurrentStep] = useState("select-avatar");
  const resumeInputRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [createdVideos, setCreatedVideos] = useState([]);
  const apiKey = process.env.NEXT_PUBLIC_GANAI_API_KEY || "";
  const ganai_url = process.env.NEXT_PUBLIC_GANAI_BACKEND_URL || "";
  // Fetch avatars when dialog opens
  const fetchAvatars = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<APIResponse>(`${ganai_url}/v1/avatars/list`, {
        headers: {
          'ganos-api-key': apiKey
        }
      })

      if (response.data?.avatars_list) {
        setAvatars(response.data.avatars_list)
      } else {
        setAvatars([])
        console.log("no avatars fetched from the api call")
      }
    } catch (err) {
      console.log({error: err})
      toast.error("failed to fetch avatars, please try again later")
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      fetchAvatars();
      setCurrentStep("select-avatar");
      setSelectedAvatar(null);
      setResumeFile(null);
      setJobDescription("");
      setCandidateEmail("");
      setTimestamp("00:00:00");
    }
  };

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
    } else {
      toast.error("Please upload a PDF file for the resume");
    }
  };

  const validateTimestamp = (value: string) => {
    // Basic validation for timestamp format (HH:MM:SS)
    const pattern = /^([0-5]\d|[0-9]):([0-5]\d):([0-5]\d)$/;
    if (pattern.test(value) || value === "") {
      setTimestamp(value);
    }
  };

  const parseResumeWithChatGPT = async (resumeText, jobDesc) => {
    try {
      // Mock API call to ChatGPT - replace with your actual API integration
      // This would be where you call ChatGPT API to analyze the resume and job description
      console.log("Parsing resume with ChatGPT...");
      
      // Simulate a ChatGPT response for demonstration
      // In reality, you would send the resume text and job description to ChatGPT
      return [
        "Hi there! Hope you're well. Could you start by introducing yourself and sharing a bit about your background?",
        `Based on your experience with ${resumeText.includes("React") ? "React" : "software development"}, can you explain a challenging project you worked on?`,
        `I see you have experience with ${resumeText.includes("API") ? "API integration" : "backend development"}. How do you approach testing and documentation?`,
        `The role requires ${jobDesc.includes("team") ? "teamwork" : "collaboration"}. Can you share an example of how you've worked effectively in a team?`,
        "That's all we had for today. Congratulations on completing the interview successfully! We'll be in touch soon."
      ];
    } catch (error) {
      console.error("Error parsing resume:", error);
      throw new Error("Failed to parse resume and generate questions");
    }
  };

  const createAvatarVideo = async (avatarId: string, text: string) => {
    try {
      const options = {
        method: 'POST',
        headers: {
          'ganos-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          avatar_id: avatarId,
          title: `Interview Question ${new Date().toISOString()}`,
          text: text,
          audio_url: ""
        })
      };

      const response = await fetch('https://os.gan.ai/v1/avatars/create_video', options);
      const data = await response.json();
      console.log("Video created:", data);
      return data;
    } catch (error) {
      console.error("Error creating avatar video:", error);
      throw new Error("Failed to create avatar video");
    }
  };

  const listCreatedVideos = async () => {
    try {
      const options = { method: 'GET', headers: { 'ganos-api-key': apiKey } };
      const response = await fetch('https://os.gan.ai/v1/avatars/list_inferences', options);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error listing videos:", error);
      throw new Error("Failed to list created videos");
    }
  };

  const extractNoddingClip = async (videoUrl: string) => {
    // This would run on the server side with ffmpeg
    // For client-side demo, we'll just log what would happen
    console.log(`Would run: ffmpeg -ss ${timestamp} -i ${videoUrl} -t 10 -c copy nodding_clip.mp4`);
    
    // In reality, you'd use a server endpoint that runs ffmpeg
    // Return a placeholder for the nodding clip URL
    return "nodding_clip.mp4";
  };

  const mergeVideos = async (questionVideos, noddingClip) => {
    // This would run on the server side with ffmpeg
    // For client-side demo, we'll just log the concept
    console.log("Would merge videos with nodding clips in between");
    
    // In reality, you'd use a server endpoint that runs ffmpeg to:
    // 1. Create a 30-second clip by looping the nodding clip 3 times
    // 2. Merge question videos with the nodding clip in between
    // Return a placeholder for the final video URL
    return "final_interview_video.mp4";
  };

  const uploadToCloudinary = async (videoFile) => {
    // This would upload to Cloudinary
    console.log("Would upload final video to Cloudinary");
    
    // Return a placeholder for the Cloudinary URL
    return "https://cloudinary.com/your-video-url";
  };

  const sendEmailToCandidate = async (email, videoUrl) => {
    // This would send an email to the candidate
    console.log(`Would send email to ${email} with video URL: ${videoUrl}`);
    
    // In reality, you'd use a mail service like SendGrid, AWS SES, etc.
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedAvatar || !resumeFile || !jobDescription || !candidateEmail || !timestamp) {
      toast("Missing Information", {
        description: "Please complete all fields before submitting"
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Read resume file
      const resumeText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(resumeFile);
      });

      // 2. Generate questions with ChatGPT
      const questions = await parseResumeWithChatGPT(resumeText, jobDescription);

      // 3. Create avatar videos for each question
      const videoPromises = questions.map(q => createAvatarVideo(selectedAvatar.avatar_id, q));
      const videoResponses = await Promise.all(videoPromises);

      // 4. Wait a bit for videos to process and then list them
      // In a real app, you might implement a polling mechanism or webhook
      await new Promise(resolve => setTimeout(resolve, 5000));
      const createdVideosList = await listCreatedVideos();
      setCreatedVideos(createdVideosList.filter(v => 
        videoResponses.some(r => r.inference_id === v.inference_id)
      ));

      // 5. Extract nodding clip from timestamp
      const noddingClip = await extractNoddingClip("original_video.mp4");

      // 6. Merge videos with nodding clips in between
      const finalVideo = await mergeVideos(createdVideosList, noddingClip);

      // 7. Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(finalVideo);

      // 8. Send email to candidate
      await sendEmailToCandidate(candidateEmail, cloudinaryUrl);

      toast.success("Interview invite created and email sent to candidate");

      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error creating interview invite:", error);
      toast.error("Failed to create interview invite");
    } finally {
      setIsLoading(false);
    }
  };

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
                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              id="resumeUpload"
                              type="file"
                              accept=".pdf"
                              ref={resumeInputRef}
                              onChange={handleResumeUpload}
                              className="flex-1"
                            />
                            {resumeFile && (
                              <span className="text-xs text-green-500">
                                {resumeFile.name}
                              </span>
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
                        disabled={!resumeFile || !jobDescription || !candidateEmail || !timestamp || isLoading}
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
                          <h4 className="text-sm font-medium text-muted-foreground">Resume File</h4>
                          <p className="text-sm">{resumeFile?.name}</p>
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
                          <li>Generate 5 interview questions based on resume and job description</li>
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
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
}
