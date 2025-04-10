'use client'

import { SidebarTrigger } from "@/components/ui/sidebar";
import React from "react";
import axios from "axios";
import Image from "next/image";
import { 
  DialogTrigger, 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";

// Updated interface based on the API response structure
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

const AvatarPage = () => {
  const [userData, setUserData] = React.useState<AvatarObject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = React.useState<string | null>(null);
  
  // Upload form state
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  
  // Confirmation checkboxes
  const [confirmSize, setConfirmSize] = React.useState(false);
  const [confirmLighting, setConfirmLighting] = React.useState(false);
  const [confirmMovement, setConfirmMovement] = React.useState(false);
  
  // Fetch avatars list
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_GANAI_BACKEND_URL;
        const apiKey = process.env.NEXT_PUBLIC_GANAI_API_KEY;
        
        if (!backendUrl || !apiKey) {
          console.error('Environment variables are missing');
          setError('Missing environment variables');
          setLoading(false);
          return;
        }
        
        console.log(`Making axios request to: ${backendUrl}/v1/avatars/list`);
        
        const res = await axios.get<APIResponse>(`${backendUrl}/v1/avatars/list`, {
          headers: {
            "ganos-api-key": apiKey,
          },
        });
        
        console.log('Response received:', res.data);
        
        if (res.data?.avatars_list) {
          setUserData(res.data.avatars_list);
        } else {
          setUserData([]);
          console.log('No avatar data found in response');
        }
      } catch (err) {
        console.error('Error fetching avatars:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    
    if (!file) {
      setUploadFile(null);
      return;
    }
    
    // Check file size (20MB = 20 * 1024 * 1024 bytes)
    if (file.size > 20 * 1024 * 1024) {
      setFileError("File size exceeds 20MB limit");
      setUploadFile(null);
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('video/')) {
      setFileError("Please select a video file");
      setUploadFile(null);
      return;
    }
    
    setUploadFile(file);
  };
  
  // Upload to Cloudinary and create avatar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setFileError("Please select a video file");
      return;
    }
    
    if (!uploadTitle.trim()) {
      toast.error("Please enter a title for your avatar");
      return;
    }
    
    if (!confirmSize || !confirmLighting || !confirmMovement) {
      toast.error("Please confirm all requirements");
      return;
    }
    
    try {
      setUploadLoading(true);
      
      // Step 1: Upload to Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        throw new Error("Cloudinary configuration missing");
      }
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('upload_preset', 'shubham unsigned'); // Create an unsigned upload preset in Cloudinary dashboard
      
      const uploadRes = await axios.post<CloudinaryResponse>(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        }
      );
      
      const videoUrl = uploadRes.data.secure_url;
      
      // Step 2: Create avatar using GAN.AI API
      const backendUrl = process.env.NEXT_PUBLIC_GANAI_BACKEND_URL;
      const apiKey = process.env.NEXT_PUBLIC_GANAI_API_KEY;
      
      if (!backendUrl || !apiKey) {
        throw new Error("GAN.AI configuration missing");
      }
      
      const createRes = await axios.post(
        `${backendUrl}/v1/avatars/create_avatar`,
        {
          title: uploadTitle,
          base_video_url: videoUrl
        },
        {
          headers: {
            "ganos-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log('Avatar creation response:', createRes.data);
      
      // Success - refresh avatar list
      toast.success("Avatar creation initiated successfully");
      
      // Reset form and close dialog
      setUploadTitle("");
      setUploadFile(null);
      setConfirmSize(false);
      setConfirmLighting(false);
      setConfirmMovement(false);
      setUploadOpen(false);
      
      // Refresh avatar list
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (err: any) {
      console.error('Error creating avatar:', err);
      toast.error( `${err.message}` || "Failed to create avatar");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  // Split avatars into stock and custom categories
  const stockAvatars = userData.filter(avatar => 
    avatar.title?.toLowerCase().startsWith('stock avatar')
  );
  
  const customAvatars = userData.filter(avatar => 
    !avatar.title?.toLowerCase().startsWith('stock avatar')
  );
  
  const renderAvatarGrid = (avatars: AvatarObject[], title: string) => {
    if (avatars.length === 0) return null;
    
    return (
      <div className="mb-10">
        <h2 className="text-slate-50 font-semibold text-xl mb-4">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {avatars.map((avatar) => (
            <Dialog key={avatar.avatar_id}>
              <DialogTrigger asChild>
                <div
                  className="relative cursor-pointer group rounded-xl overflow-hidden shadow-md"
                  onClick={() => {
                    setSelectedVideo(avatar.base_video);
                    setSelectedTitle(avatar.title);
                  }}
                >
                  <Image
                    src={avatar.thumbnail}
                    alt={avatar.title || 'Avatar thumbnail'}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-30 transition">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-none p-2">
                    <p className="text-white truncate text-sm">{avatar.title}</p>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-4">
                <DialogTitle>
                  {selectedTitle || "Avatar Video"}
                </DialogTitle>
                {selectedVideo && (
                  <video
                    controls
                    autoPlay
                    src={selectedVideo}
                    className="w-full h-auto rounded-lg"
                  />
                )}
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 h-9" />
        </div>
        <span className="text-slate-50 font-semibold"> Avatars </span>
        <div className="flex flex-1 justify-end mx-16 mt-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="default">Generate Avatar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Generate New Avatar</DialogTitle>
                <DialogDescription>
                  Upload a video to generate a new avatar. Please ensure your video meets the requirements.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Avatar Title</Label>
                  <Input 
                    id="title" 
                    placeholder="My Avatar" 
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="video">Video File</Label>
                  <Input 
                    id="video" 
                    type="file" 
                    accept="video/*"
                    onChange={handleFileChange}
                    required
                  />
                  {fileError && (
                    <p className="text-red-500 text-sm">{fileError}</p>
                  )}
                  {uploadFile && (
                    <p className="text-sm text-green-500">
                      Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)}MB)
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base">Requirements</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="size" 
                        checked={confirmSize} 
                        onCheckedChange={(checked) => setConfirmSize(checked as boolean)} 
                      />
                      <Label htmlFor="size" className="text-sm">Video is under 20MB</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="lighting" 
                        checked={confirmLighting} 
                        onCheckedChange={(checked) => setConfirmLighting(checked as boolean)} 
                      />
                      <Label htmlFor="lighting" className="text-sm">Video includes 10 seconds of you smiling warmly and nodding</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="movement" 
                        checked={confirmMovement} 
                        onCheckedChange={(checked) => setConfirmMovement(checked as boolean)} 
                      />
                      <Label htmlFor="movement" className="text-sm">No sudden jerks or hard movements in the video</Label>
                    </div>
                  </div>
                </div>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                    <p className="text-xs text-center mt-1">Uploading: {uploadProgress}%</p>
                  </div>
                )}
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={uploadLoading || !uploadFile || !uploadTitle.trim() || !confirmSize || !confirmLighting || !confirmMovement}
                  >
                    {uploadLoading ? "Uploading..." : "Generate Avatar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      
      <div className="px-16 py-6">
        {loading ? (
          <div className="text-white text-center">Loading avatars...</div>
        ) : error ? (
          <div className="text-red-500 text-center">Error: {error}</div>
        ) : userData.length > 0 ? (
          <>
            {/* Custom Avatars Section */}
            {renderAvatarGrid(customAvatars, "Custom Avatars")}
            
            {/* Stock Avatars Section */}
            {renderAvatarGrid(stockAvatars, "Stock Avatars")}
          </>
        ) : (
          <div className="text-white text-center">No avatars found</div>
        )}
      </div>
      <Toaster />
    </>
  );
};

export default AvatarPage;
