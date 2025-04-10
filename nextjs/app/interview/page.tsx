"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

enum InterviewStep {
  Setup = "setup",
  PreJoin = "pre-join",
  Interview = "interview",
  Submitting = "submitting",
  Complete = "complete",
  Error = "error",
}

export default function InterviewPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<InterviewStep>(InterviewStep.Setup);
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Media device states
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(
    null,
  );
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(
    null,
  );
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  // Interview progress
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const interviewerVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Helper function to create play overlay for autoplay issues
  const createPlayOverlay = (videoElement: HTMLVideoElement) => {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.cursor = 'pointer';
    overlay.style.zIndex = '10';
    
    // Create play button
    const playButton = document.createElement('div');
    playButton.innerHTML = '▶️';
    playButton.style.fontSize = '48px';
    
    // Append button to overlay
    overlay.appendChild(playButton);
    
    // Add click handler
    overlay.addEventListener('click', async () => {
      try {
        await videoElement.play();
        console.log("Video started playing after user interaction");
        // Remove overlay on success
        overlay.remove();
      } catch (err) {
        console.error("Failed to play video after click:", err);
        toast.error("Could not start camera preview. Please try a different browser.");
      }
    });
    
    // Add to video container
    videoElement.parentElement?.appendChild(overlay);
  };

  // Fetch interview data
  useEffect(() => {
    if (!token) {
      setError(
        "Invalid interview link. Please check your email for the correct link.",
      );
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state: "WAITING_FOR_CANDIDATE" }),
        });
      } catch (err) {
        console.error("Error fetching interview:", err);
        setError("Failed to load interview");
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
        console.log("Starting media device check");

        // First check if the API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Your browser doesn't support camera and microphone access.",
          );
        }

        // Explicitly request permissions BEFORE enumerating devices
        console.log("Requesting camera and microphone permissions...");
        try {
          // IMPORTANT: Simplify the initial permission request
          const initialStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true, 
          });
          
          // Important: Save the initial stream and display it immediately
          streamRef.current = initialStream;
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = initialStream;
            
            // Explicitly force a play attempt with proper error handling
            try {
              await localVideoRef.current.play();
              console.log("Local video playing after initial permissions");
            } catch (playErr) {
              console.warn("Initial play failed:", playErr);
              // Create a play button overlay as fallback
              createPlayOverlay(localVideoRef.current);
            }
          }
          
          console.log("Camera and microphone permissions granted");
          setHasCamera(initialStream.getVideoTracks().length > 0);
          setHasMicrophone(initialStream.getAudioTracks().length > 0);
        } catch (permErr) {
          console.error("Permission error:", permErr);
          // Try audio only as fallback
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = audioStream;
            console.log("Only microphone permission granted");
            setCameraEnabled(false);
            setHasCamera(false);
            setHasMicrophone(true);
          } catch (audioErr) {
            console.error("Audio permission error:", audioErr);
            throw new Error(
              "Could not access microphone. Please check browser permissions.",
            );
          }
        }

        // Enumerate devices after getting permissions
        console.log("Enumerating devices after permissions...");
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("All devices:", devices);

        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput",
        );
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );

        console.log("Audio inputs:", audioInputs);
        console.log("Video inputs:", videoInputs);

        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);
        setHasMicrophone(audioInputs.length > 0);

        // Check if we have actual video inputs and set hasCamera accordingly
        const actuallyHasCamera = videoInputs.length > 0;
        console.log("Actually has camera:", actuallyHasCamera);
        setHasCamera(actuallyHasCamera);
        
        // Only set camera to enabled if we actually have a camera
        setCameraEnabled(actuallyHasCamera && streamRef.current?.getVideoTracks().length > 0);

        // Set default devices
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }

        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }

        setStep(InterviewStep.PreJoin);
      } catch {
        console.error("Error during media device check:", err);
        setError("Failed to access camera and microphone");
        toast.error(
          "Media Access Error: " +
            ("Could not access your camera and microphone"),
        );
      }
    };

    checkMediaDevices();

    return () => {
      console.log("Cleaning up media resources");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        });
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        console.log("Stopping media recorder");
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Error stopping media recorder:", err);
        }
      }
    };
  }, [step, isLoading]);

  // Function to actually display a stream in the video element
  const displayVideoStream = async (stream: MediaStream, videoElement: HTMLVideoElement) => {
    if (!stream || !videoElement) return false;
    
    try {
      // First make sure we have video tracks if we're expecting them
      const hasVideoTracks = stream.getVideoTracks().length > 0;
      
      // Set the srcObject
      videoElement.srcObject = stream;
      
      // Attempt to play
      try {
        await videoElement.play();
        console.log("Video playing successfully");
        return true;
      } catch (playErr) {
        console.warn("Error playing video:", playErr);
        
        // Create an interactive overlay only if we have video tracks
        if (hasVideoTracks) {
          createPlayOverlay(videoElement);
        }
        
        return false;
      }
    } catch (err) {
      console.error("Error displaying video stream:", err);
      return false;
    }
  };

  // Function to set up media stream
  const setupMediaStream = async () => {
    try {
      console.log("Setting up media stream");

      // Stop any existing stream first
      if (streamRef.current) {
        console.log("Stopping existing stream");
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped track: ${track.kind}`);
        });
      }

      // Check if we actually have a camera selected
      const cameraSelected = videoDevices.length > 0 && selectedVideoDevice;
      console.log(
        "Camera selected:",
        cameraSelected,
        "Device ID:",
        selectedVideoDevice,
      );

      // Create constraints based on selected devices
      const constraints = {
        audio: selectedAudioDevice
          ? { deviceId: { exact: selectedAudioDevice } }
          : true,
        video: cameraSelected && cameraEnabled
          ? {
              deviceId: { exact: selectedVideoDevice },
              // Use more forgiving constraints
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { max: 15 },
            }
          : false,
      };

      console.log("Using constraints:", JSON.stringify(constraints));

      // Get user media with these constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(
        "Got media stream with tracks:",
        stream.getTracks().map((t) => t.kind),
      );

      // Verify we have tracks before proceeding
      const hasAudioTrack = stream.getAudioTracks().length > 0;
      const hasVideoTrack = stream.getVideoTracks().length > 0;

      console.log(
        `Stream has audio: ${hasAudioTrack}, video: ${hasVideoTrack}`,
      );

      if (!hasAudioTrack && !hasVideoTrack) {
        throw new Error("No audio or video tracks available in the stream");
      }

      // Update UI based on tracks
      setHasMicrophone(hasAudioTrack);
      setHasCamera(hasVideoTrack);
      if (!hasVideoTrack) {
        setCameraEnabled(false);
      }
      
      // Store the stream
      streamRef.current = stream;

      // Display preview - now using our helper function
      if (localVideoRef.current) {
        const playSuccess = await displayVideoStream(stream, localVideoRef.current);
        if (!playSuccess) {
          console.warn("Video display not immediately successful, overlay created");
        }
      } else {
        console.error("localVideoRef.current is null");
      }
      
      return true;
    } catch (err) {
      console.error("Error setting up media stream:", err);
      toast.error("Media Error: Could not access selected devices");
      throw err;
    }
  };

  // Function to toggle camera
  const toggleCamera = async () => {
    if (!streamRef.current) return;

    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);

    if (enabled && streamRef.current.getVideoTracks().length === 0) {
      // We need to recreate the stream to add video
      await setupMediaStream();
    } else {
      // Just toggle existing tracks
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  };

  // Function to toggle microphone
  const toggleMicrophone = () => {
    if (!streamRef.current) return;

    const enabled = !microphoneEnabled;
    setMicrophoneEnabled(enabled);

    // Enable/disable audio tracks
    streamRef.current.getAudioTracks().forEach((track) => {
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

  // Improved function to refresh the stream
  const refreshStream = async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Get fresh stream with appropriate constraints based on current states
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: hasCamera && cameraEnabled,
      });

      // Check if we got tracks
      console.log(
        "New stream tracks:",
        stream.getTracks().map((t) => t.kind),
      );

      // Store stream
      streamRef.current = stream;

      // Update local video display using our helper function
      if (localVideoRef.current) {
        await displayVideoStream(stream, localVideoRef.current);
      }

      return (
        stream.getAudioTracks().length > 0 || stream.getVideoTracks().length > 0
      );
    } catch (err) {
      console.error("Failed to refresh stream:", err);
      return false;
    }
  };

  // Fixed function to start the interview
  const startInterview = async () => {
    console.log("Starting interview...");

    if (!interview || !interview.interviewVideoUrl) {
      console.error("Interview video URL not found");
      toast.error("Error: Interview video not found");
      return;
    }
    
    const hasActiveStream = await refreshStream();
    if (!hasActiveStream) {
      toast.error("Could not access camera or microphone");
      return;
    }

    console.log("Interview video URL:", interview.interviewVideoUrl);

    // Verify we have at least some media available
    if (!streamRef.current) {
      console.error("No media stream available");
      toast.error("Cannot start interview: Media not available");
      return;
    }

    const hasAudioTrack = streamRef.current.getAudioTracks().length > 0;
    const hasVideoTrack = streamRef.current.getVideoTracks().length > 0;

    // Allow interview with audio only, but give warning
    if (!hasVideoTrack && hasAudioTrack) {
      console.warn("Starting interview with audio only");
      toast.warning(
        "Starting interview with audio only. Video is not available."
      );
    }

    // Require at least audio for the interview
    if (!hasAudioTrack) {
      console.error("No audio track available");
      toast.error("Cannot start interview: Microphone is required");
      return;
    }

    try {
      // Start recording immediately
      startRecording();
      
      // Switch to interview mode first, so the UI elements are ready
      setStep(InterviewStep.Interview);
      
      // Wait a moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Make sure our local video is visible in the new UI
      if (localVideoRef.current && streamRef.current) {
        await displayVideoStream(streamRef.current, localVideoRef.current);
      }
      
      // Verify the video URL format
      let videoUrl = interview.interviewVideoUrl;
      
      // If URL is relative, make it absolute
      if (videoUrl && videoUrl.startsWith('/')) {
        const baseUrl = window.location.origin;
        videoUrl = `${baseUrl}${videoUrl}`;
        console.log("Converted to absolute URL:", videoUrl);
      }
      
      // Now find the interviewer video element in the DOM
      // Try to get the element via ref first
      let videoElement = interviewerVideoRef.current;
      
      // If ref doesn't work, try to find it directly in the DOM
      if (!videoElement) {
        videoElement = document.querySelector('.interviewer-video') as HTMLVideoElement;
        // Update the ref if we found the element
        if (videoElement) {
          interviewerVideoRef.current = videoElement;
        }
      }
      
      if (!videoElement) {
        console.error("Could not find interviewer video element");
        toast.error("Error: Could not initialize video player");
        return;
      }
      
      console.log("Found video element:", videoElement);
      
      // Set up event listeners before setting source
      videoElement.onloadedmetadata = () => {
        console.log("Video metadata loaded");
      };
      
      videoElement.oncanplay = () => {
        console.log("Video can play event fired");
      };
      
      videoElement.onplay = () => {
        console.log("Interviewer video playing");
        setIsInterviewerSpeaking(true);
      };
      
      videoElement.onpause = () => {
        console.log("Interviewer video paused");
        setIsInterviewerSpeaking(false);
      };
      
      videoElement.onended = () => {
        console.log("Interviewer video ended");
        setIsInterviewerSpeaking(false);
        finishInterview();
      };
      
      videoElement.ontimeupdate = () => {
        if (videoElement) {
          const currentTime = videoElement.currentTime;
          const duration = videoElement.duration;
          if (duration > 0) {
            const calculatedProgress = (currentTime / duration) * 100;
            setProgress(calculatedProgress);
          }
        }
      };
      
      videoElement.onerror = (e) => {
        console.error("Video element error:", videoElement.error);
        toast.error(`Video error: ${videoElement.error?.message || "Unknown error"}`);
      };
      
      // Set source and try to load
      videoElement.src = videoUrl;
      videoElement.load();
      
      // Create a click overlay to start the video (addressing autoplay restrictions)
      const overlayDiv = document.createElement("div");
      overlayDiv.style.position = "fixed";
      overlayDiv.style.top = "0";
      overlayDiv.style.left = "0";
      overlayDiv.style.width = "100%";
      overlayDiv.style.height = "100%";
      overlayDiv.style.backgroundColor = "rgba(0,0,0,0.7)";
      overlayDiv.style.zIndex = "9999";
      overlayDiv.style.display = "flex";
      overlayDiv.style.justifyContent = "center";
      overlayDiv.style.alignItems = "center";
      overlayDiv.style.cursor = "pointer";

      const messageDiv = document.createElement("div");
      messageDiv.style.color = "white";
      messageDiv.style.fontSize = "24px";
      messageDiv.style.textAlign = "center";
      messageDiv.style.padding = "20px";
      messageDiv.innerHTML = "<strong>Click anywhere to start the interview</strong>";

      overlayDiv.appendChild(messageDiv);
      document.body.appendChild(overlayDiv);

      overlayDiv.onclick = async () => {
        try {
          document.body.removeChild(overlayDiv);
          console.log("Attempting to play video after user interaction");
          
          try {
            await videoElement.play();
            console.log("Interviewer video playing successfully");
          } catch (playError) {
            console.error("Error playing video after user interaction:", playError);
            toast.error("Could not play the interview. Please try a different browser.");
          }
        } catch (error) {
          console.error("Error during play attempt:", error);
        }
      };
    } catch (err) {
      console.error("Error starting interview:", err);
      toast.error("Failed to start the interview: " + (err.message || "Unknown error"));
    }
  };

  // More robust startRecording function
  const startRecording = () => {
    console.log("Starting recording...");

    if (!streamRef.current) {
      console.error("No stream available for recording");
      toast.error("Cannot record: No media stream available");
      return;
    }

    // Check if stream is active
    const hasActiveVideoTrack = streamRef.current
      .getVideoTracks()
      .some((track) => track.enabled && track.readyState === "live");
    const hasActiveAudioTrack = streamRef.current
      .getAudioTracks()
      .some((track) => track.enabled && track.readyState === "live");

    console.log(
      `Active tracks - video: ${hasActiveVideoTrack}, audio: ${hasActiveAudioTrack}`,
    );

    // Allow audio-only recording
    if (!hasActiveAudioTrack && !hasActiveVideoTrack) {
      console.error("No active tracks in stream");
      toast.error("Cannot record: No active audio or video");
      return;
    }

    try {
      // Clear any previously recorded chunks
      recordedChunksRef.current = [];

      // Update MIME types order for better compatibility
      const mimeTypes = [
        "video/webm",
        "audio/webm", // Try audio-only format if video formats fail
        "video/webm;codecs=vp8",
        "video/webm;codecs=vp9",
        "video/mp4",
        "audio/mp4",
      ];

      let options = {};
      let supportedType = "";

      // Find the first supported type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          supportedType = type;
          options = { mimeType: type };
          console.log(`Using supported MIME type: ${type}`);
          break;
        }
      }

      if (!supportedType) {
        console.warn("No supported MIME types found, using browser default");
      }

      console.log("Creating MediaRecorder with options:", options);

      // If we only have audio, use an audio-only stream for recording
      let recordingStream = streamRef.current;
      if (
        hasActiveAudioTrack &&
        !hasActiveVideoTrack &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        console.log("Creating audio-only MediaRecorder");
        options = { mimeType: "audio/webm" };

        // Create a new audio-only stream
        const audioTrack = streamRef.current.getAudioTracks()[0];
        recordingStream = new MediaStream([audioTrack]);
      }

      mediaRecorderRef.current = new MediaRecorder(
        recordingStream,
        supportedType ? options : undefined,
      );

      // Set up data handler
      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log(`Data available event, size: ${event.data?.size || 0}`);
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Set up error handler
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Recording error occurred");
      };

      // Start recording with chunks every second
      console.log("Starting MediaRecorder");
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      toast.error(
        "Failed to start recording: " + (err.message || "Unknown error"),
      );
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
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
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });

        // Create a form data object to send the blob
        const formData = new FormData();
        formData.append("video", recordedBlob);
        formData.append("interviewId", interview.id);

        // Upload the recording
        const response = await fetch(`/api/interviews/submit-recording`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload recording");
        }

        // Mark interview as complete
        setStep(InterviewStep.Complete);
      } catch (err) {
        console.error("Error submitting recording:", err);
        setError("Failed to submit recording");
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
            <Button onClick={() => window.location.reload()}>Try Again</Button>
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
            <p>
              Your interview has been recorded and submitted successfully. The
              hiring team will review your responses and get back to you soon.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.close()}>Close</Button>
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
                <h3 className="text-lg font-medium">
                  Camera and Microphone Check
                </h3>

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
                    disabled={!hasCamera}
                  >
                    {cameraEnabled ? (
                      <>
                        <Video className="h-4 w-4 mr-2" /> Camera On
                      </>
                    ) : (
                      <>
                        <VideoOff className="h-4 w-4 mr-2" /> Camera Off
                      </>
                    )}
                  </Button>

                  <Button
                    variant={microphoneEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={toggleMicrophone}
                  >
                    {microphoneEnabled ? (
                      <>
                        <Mic className="h-4 w-4 mr-2" /> Mic On
                      </>
                    ) : (
                      <>
                        <MicOff className="h-4 w-4 mr-2" /> Mic Off
                      </>
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
                      value={selectedVideoDevice || ""}
                      onChange={(e) => changeVideoDevice(e.target.value)}
                      disabled={!hasCamera}
                    >
                      {!hasCamera && (
                        <option value="">No camera detected</option>
                      )}
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label ||
                            `Camera ${videoDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Microphone</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={selectedAudioDevice || ""}
                      onChange={(e) => changeAudioDevice(e.target.value)}
                      disabled={!hasMicrophone}
                    >
                      {!hasMicrophone && (
                        <option value="">No microphone detected</option>
                      )}
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label ||
                            `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-medium">
                    Interview Instructions
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Ensure your face is well-lit and clearly visible</li>
                    <li>Find a quiet place with minimal background noise</li>
                    <li>The interview will consist of 5 questions</li>
                    <li>Your responses will be recorded for review</li>
                    <li>
                      Simply respond naturally when the interviewer pauses
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              size="lg"
              disabled={!hasMicrophone} // Only require microphone, not camera
              onClick={startInterview}
            >
              Join Interview
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Improved side-by-side Live Interview UI
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
      {/* Main content area with side-by-side videos */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Interviewer Video - Now takes half the screen width on desktop */}
        <div className="relative bg-black overflow-hidden">
          <video
            ref={interviewerVideoRef}
            className="w-full h-full object-contain interviewer-video"
            playsInline
            controls={false}
          />
          
          {isInterviewerSpeaking && (
            <div className="absolute top-4 left-4 bg-blue-500 bg-opacity-70 px-3 py-1 rounded-full text-sm text-white">
              Interviewer speaking
            </div>
          )}
        </div>

        {/* Candidate Video - Now takes half the screen width on desktop */}
        <div className="relative bg-gray-800 overflow-hidden">
          <video
            ref={localVideoRef}
            muted
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          {!cameraEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
              <p className="text-white">Camera is off</p>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center bg-red-500 bg-opacity-70 px-3 py-1 rounded-full text-sm text-white">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
              Recording
            </div>
          )}

          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button
              className={`p-2 rounded-full ${cameraEnabled ? "bg-gray-700" : "bg-red-600"}`}
              onClick={toggleCamera}
              disabled={!hasCamera}
            >
              {cameraEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
              )}
            </button>

            <button
              className={`p-2 rounded-full ${microphoneEnabled ? "bg-gray-700" : "bg-red-600"}`}
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

      {/* Bottom controls with progress bar */}
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
              if (
                confirm(
                  "Are you sure you want to end the interview? This cannot be undone.",
                )
              ) {
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
