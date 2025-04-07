// app/interview/page.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mic, MicOff, Video, VideoOff, Phone, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";

enum InterviewStep {
  Setup = 'setup',
  PreJoin = 'pre-join',
  Interview = 'interview',
  Submitting = 'submitting',
  Complete = 'complete',
  Error = 'error'
}

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<InterviewStep>(InterviewStep.Setup);
  const [interview, setInterview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Media device states
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(null);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  
  // Interview progress
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const interviewerVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Fetch interview data
  useEffect(() => {
    if (!token) {
      setError("Invalid interview link. Please check your email for the correct link.");
      setStep(InterviewStep.Error);
      setIsLoading(false);
      return;
    }
    
    const fetchInterview = async () => {
      try {
        const response = await fetch(`/api/interviews/validate?token=${token}`);
        
        if (!response.ok) {
          throw new Error("Failed to load interview");
        }
        
        const data = await response.json();
        
        if (!data.interview) {
          throw new Error("Interview not found");
        }
        
        setInterview(data.interview);
        setIsLoading(false);
        
        // Mark interview as waiting for candidate
        await fetch(`/api/interviews/${data.interview.id}/update-state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state: 'WAITING_FOR_CANDIDATE' }),
        });
        
      } catch (err: any) {
        console.error("Error fetching interview:", err);
        setError(err.message || "Failed to load interview");
        setStep(InterviewStep.Error);
        setIsLoading(false);
      }
    };
    
    fetchInterview();
  }, [token]);
  
  // Initialize media devices
  useEffect(() => {
    if (step !== InterviewStep.Setup || isLoading) return;
    
    const checkMediaDevices = async () => {
      try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser doesn't support camera and microphone access.");
        }
        
        // Check available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        
        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);
        setHasMicrophone(audioInputs.length > 0);
        setHasCamera(videoInputs.length > 0);
        
        // Set default devices
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        
        // Request permissions and show preview
        await setupMediaStream();
        
        setStep(InterviewStep.PreJoin);
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        setError(err.message || "Failed to access camera and microphone");
        toast({
          title: "Media Access Error",
          description: err.message || "Could not access your camera and microphone",
          variant: "destructive",
        });
      }
    };
    
    checkMediaDevices();
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [step, isLoading]);
  
  // Function to set up media stream
  const setupMediaStream = async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Create constraints based on selected devices
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true
      };
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Display preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error setting up media stream:", err);
      toast({
        title: "Media Error",
        description: err.message || "Could not access selected devices",
        variant: "destructive",
      });
    }
  };
  
  // Function to toggle camera
  const toggleCamera = async () => {
    if (!streamRef.current) return;
    
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    
    // Enable/disable video tracks
    streamRef.current.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  };
  
  // Function to toggle microphone
  const toggleMicrophone = () => {
    if (!streamRef.current) return;
    
    const enabled = !microphoneEnabled;
    setMicrophoneEnabled(enabled);
    
    // Enable/disable audio tracks
    streamRef.current.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  };
  
  // Function to change audio device
  const changeAudioDevice = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    await setupMediaStream();
  };
  
  // Function to change video device
  const changeVideoDevice = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    await setupMediaStream();
  };
  
  // Function to start the interview
  const startInterview = async () => {
    if (!interview || !interview.interviewVideoUrl) {
      toast({
        title: "Error",
        description: "Interview video not found",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Start recording
      startRecording();
      
      // Load and play the interviewer video
      if (interviewerVideoRef.current) {
        interviewerVideoRef.current.src = interview.interviewVideoUrl;
        interviewerVideoRef.current.load();
        
        // Set up event listeners
        interviewerVideoRef.current.onplay = () => {
          setIsInterviewerSpeaking(true);
        };
        
        interviewerVideoRef.current.onpause = () => {
          setIsInterviewerSpeaking(false);
        };
        
        interviewerVideoRef.current.onended = () => {
          setIsInterviewerSpeaking(false);
          finishInterview();
        };
        
        // Set up timeupdate listener to update progress
        interviewerVideoRef.current.ontimeupdate = () => {
          if (interviewerVideoRef.current) {
            const currentTime = interviewerVideoRef.current.currentTime;
            const duration = interviewerVideoRef.current.duration;
            const calculatedProgress = (currentTime / duration) * 100;
            setProgress(calculatedProgress);
          }
        };
        
        // Play the video
        await interviewerVideoRef.current.play();
      }
      
      setStep(InterviewStep.Interview);
    } catch (err: any) {
      console.error("Error starting interview:", err);
      toast({
        title: "Error",
        description: "Failed to start the interview",
        variant: "destructive",
      });
    }
  };
  
  // Function to start recording
  const startRecording = () => {
    if (!streamRef.current) return;
    
    // Clear any previously recorded chunks
    recordedChunksRef.current = [];
    
    // Create media recorder
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
    
    // Set up data handler
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    // Start recording
    mediaRecorderRef.current.start(1000); // Capture in 1-second chunks
    setIsRecording(true);
  };
  
  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Function to finish the interview
  const finishInterview = async () => {
    // Stop recording
    stopRecording();
    
    // Allow some time for the last chunks to be collected
    setTimeout(async () => {
      setStep(InterviewStep.Submitting);
      
      try {
        // Create a single blob from all recorded chunks
        const recordedBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        // Create a form data object to send the blob
        const formData = new FormData();
        formData.append('video', recordedBlob);
        formData.append('interviewId', interview.id);
        
        // Upload the recording
        const response = await fetch(`/api/interviews/submit-recording`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error("Failed to upload recording");
        }
        
        // Mark interview as complete
        setStep(InterviewStep.Complete);
      } catch (err: any) {
        console.error("Error submitting recording:", err);
        setError(err.message || "Failed to submit recording");
        setStep(InterviewStep.Error);
      }
    }, 1000);
  };
  
  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 text-xl font-medium">Loading interview...</h2>
        </div>
      </div>
    );
  }
  
  // If error occurred, show error state
  if (step === InterviewStep.Error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="mr-2 h-6 w-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "An unknown error occurred"}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If interview completed, show completion state
  if (step === InterviewStep.Complete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
<CheckCircle className="mr-2 h-6 w-6" />
              Interview Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Thank you for completing your interview!</p>
            <p>Your interview has been recorded and submitted successfully. The hiring team will review your responses and get back to you soon.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.close()}>
              Close
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If submitting interview
  if (step === InterviewStep.Submitting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Submitting Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p>Please wait while we upload your interview recording...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Setup and Pre-Join UI
  if (step === InterviewStep.Setup || step === InterviewStep.PreJoin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Interview Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Camera and Microphone Check</h3>
                
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    muted
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {!cameraEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                      <p className="text-white">Camera is off</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center space-x-2">
                  <Button 
                    variant={cameraEnabled ? "default" : "outline"} 
                    size="sm"
                    onClick={toggleCamera}
                  >
                    {cameraEnabled ? (
                      <><Video className="h-4 w-4 mr-2" /> Camera On</>
                    ) : (
                      <><VideoOff className="h-4 w-4 mr-2" /> Camera Off</>
                    )}
                  </Button>
                  
                  <Button 
                    variant={microphoneEnabled ? "default" : "outline"} 
                    size="sm"
                    onClick={toggleMicrophone}
                  >
                    {microphoneEnabled ? (
                      <><Mic className="h-4 w-4 mr-2" /> Mic On</>
                    ) : (
                      <><MicOff className="h-4 w-4 mr-2" /> Mic Off</>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Device Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Camera</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedVideoDevice || ''}
                      onChange={(e) => changeVideoDevice(e.target.value)}
                      disabled={!hasCamera}
                    >
                      {!hasCamera && <option value="">No camera detected</option>}
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Microphone</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedAudioDevice || ''}
                      onChange={(e) => changeAudioDevice(e.target.value)}
                      disabled={!hasMicrophone}
                    >
                      {!hasMicrophone && <option value="">No microphone detected</option>}
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium">Interview Instructions</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Ensure your face is well-lit and clearly visible</li>
                    <li>Find a quiet place with minimal background noise</li>
                    <li>The interview will consist of 5 questions</li>
                    <li>Your responses will be recorded for review</li>
                    <li>Simply respond naturally when the interviewer pauses</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button 
              size="lg"
              disabled={!hasCamera || !hasMicrophone}
              onClick={startInterview}
            >
              Join Interview
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Live Interview UI
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Interviewer Video */}
        <div className="flex-1 relative bg-black">
          <video
            ref={interviewerVideoRef}
            className="w-full h-full object-cover"
            playsInline
          />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-2 text-white">
            <div className="bg-black bg-opacity-60 px-3 py-1 rounded-full text-sm">
              {isInterviewerSpeaking ? "Interviewer speaking..." : "Waiting for your response..."}
            </div>
            
            {isRecording && (
              <div className="flex items-center bg-red-500 bg-opacity-60 px-3 py-1 rounded-full text-sm">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
                Recording
              </div>
            )}
          </div>
        </div>
        
        {/* Candidate Video */}
        <div className="w-full md:w-80 h-60 md:h-auto relative bg-gray-800">
          <video
            ref={localVideoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {!cameraEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
              <p className="text-white">Camera is off</p>
            </div>
          )}
          
          <div className="absolute bottom-2 right-2 flex space-x-2">
            <button 
              className={`p-2 rounded-full ${cameraEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
              onClick={toggleCamera}
            >
              {cameraEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
              )}
            </button>
            
            <button 
              className={`p-2 rounded-full ${microphoneEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
              onClick={toggleMicrophone}
            >
              {microphoneEnabled ? (
                <Mic className="h-5 w-5 text-white" />
              ) : (
                <MicOff className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom controls */}
      <div className="bg-gray-800 text-white p-4 flex flex-col">
        <Progress value={progress} className="mb-4" />
        
        <div className="flex justify-between items-center">
          <div>
            <p>Interview Progress: {Math.round(progress)}%</p>
          </div>
          
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to end the interview? This cannot be undone.")) {
                finishInterview();
              }
            }}
          >
            <Phone className="h-4 w-4 mr-2" /> End Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
