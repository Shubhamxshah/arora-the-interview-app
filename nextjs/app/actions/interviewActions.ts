'use server'

import Groq from "groq-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { ProcessingState } from '@prisma/client';
import { auth }  from "@/auth"
import { prisma } from "@/lib/prisma"
import axios from "axios";

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Promisify exec for easier use with async/await
const execPromise = promisify(exec);

interface InterviewInput {
  avatarId: string;
  resumeText: string;
  jobDescription: string;
  candidateEmail: string;
  timestamp: string;
  creatorEmail: string;
}

// Main function to create an interview
export async function createInterview(input: InterviewInput) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "Authentication required" };
    }

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { email: input.creatorEmail }
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Create the interview record in the database
    const interview = await prisma.interview.create({
      data: {
        creatorId: user.id,
        avatarId: input.avatarId,
        candidateEmail: input.candidateEmail,
        jobDescription: input.jobDescription,
        resumeText: input.resumeText,
        timestamp: input.timestamp,
        questions: [], // Will be populated later
        processingState: 'CREATING_QUESTIONS'
      }
    });

    // Start the processing pipeline asynchronously
    processInterview(interview.id).catch(error => {
      console.error(`Error processing interview ${interview.id}:`, error);
      updateInterviewState(interview.id, 'FAILED');
    });

    return {
      success: true,
      interviewId: interview.id
    };
  } catch (error) {
    console.error("Error creating interview:", error);
    return {
      success: false,
    };
  }
}

// Function to update the interview state
async function updateInterviewState(interviewId: string, state: ProcessingState) {
  try {
    await prisma.interview.update({
      where: { id: interviewId },
      data: { processingState: state }
    });
  } catch (error) {
    console.error(`Error updating state for interview ${interviewId}:`, error);
  }
}

// Main processing pipeline for the interview
async function processInterview(interviewId: string) {
  // Create a unique processing ID for this interview
  const processId = `process_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  console.log(`[${processId}] Starting interview processing for interview ${interviewId}`);
  
  try {
    // Get the interview details
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      throw new Error("Interview not found");
    }

    console.log(`[${processId}] Generating questions`);
    // Step 1: Generate questions
    const questions = await generateInterviewQuestions(
      interview.resumeText,
      interview.jobDescription
    );

    // Update the interview with the generated questions
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        questions,
        processingState: 'GENERATING_VIDEOS'
      }
    });

    console.log(`[${processId}] Creating avatar videos for ${questions.length} questions`);
    // Step 2: Create avatar videos
    const videoIds = await createAvatarVideos(interview.avatarId, questions);

    // Update the interview state
    await updateInterviewState(interviewId, 'PROCESSING_VIDEOS');

    console.log(`[${processId}] Waiting for videos to be processed: ${videoIds.join(', ')}`);
    // Step 3: Wait for videos to be processed
    const videoUrls = await waitForVideos(videoIds, interview.avatarId);

    console.log(`[${processId}] Downloading ${videoUrls.length} videos`);
    // Step 4: Download the videos
    const videoFilePaths = await downloadVideos(videoUrls);

    // Step 5: Extract and prepare the nodding clip
    console.log(`[${processId}] Preparing nodding clip`);
    await updateInterviewState(interviewId, 'MERGING_VIDEOS');
    const noddingClipPath = await prepareNoddingClip(interview.timestamp, interview.avatarId);

    // Step 6: Merge all videos with nodding clips in between
    console.log(`[${processId}] Merging videos`);
    const finalVideoPath = await mergeVideos(videoFilePaths, noddingClipPath);

    // Step 7: Upload to Cloudinary
    console.log(`[${processId}] Uploading to Cloudinary`);
    await updateInterviewState(interviewId, 'UPLOADING_VIDEO');
    const cloudinaryResult = await uploadToCloudinary(finalVideoPath);

    // Step 8: Update the interview with the video URL
    console.log(`[${processId}] Updating interview with video URL`);
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        interviewVideoUrl: cloudinaryResult.secure_url,
        interviewThumbnailUrl: cloudinaryResult.secure_url.replace(/\.[^/.]+$/, ".jpg"),
        processingState: 'READY_FOR_CANDIDATE'
      }
    });

    // Step 9: Clean up temporary files
    console.log(`[${processId}] Cleaning up temporary files`);
    const filesToCleanup = [...videoFilePaths, noddingClipPath, finalVideoPath];
    await cleanupTempFiles(filesToCleanup);
    
    console.log(`[${processId}] Interview processing completed successfully for interview ${interviewId}`);
  } catch (error) {
    console.error(`[${processId}] Error processing interview ${interviewId}:`, error);
    await updateInterviewState(interviewId, 'FAILED');
    
    // Add more detailed error information
    try {
      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          processingError: error || "Unknown error occurred during processing"
        }
      });
    } catch (dbError) {
      console.error(`[${processId}] Failed to update processing error in database:`, dbError);
    }
  }
}
// Function to generate interview questions using Groq
async function generateInterviewQuestions(resumeText: string, jobDescription: string): Promise<string[]> {
  try {
    const prompt = `
      // I have a candidate's resume and a job description. Based on these, generate 5 interview questions:
      //
      // 1. A friendly introduction question (start with "Hi there! Hope you're well.")
      // 2. Three technical or experience-based questions that match the candidate's skills with the job requirements
      // 3. A friendly conclusion (end with "That's all we had for today. Congratulations on completing the interview successfully!")
      //
      // Format the output as a JSON array of 5 strings, one for each question. Keep each question under 30 words.

      I have a candidate's resume and a job description. Based on these, generate 2 interview questions:
      
      1. it should be technical or experience-based questions that match the candidate's skills with the job requirements
      
      Format the output as a JSON array of a 2 strings. Keep question under 30 words.

      Resume:
      ${resumeText.substring(0, 1500)}
      
      Job Description:
      ${jobDescription.substring(0, 1000)}
    `;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-70b-8192",
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate questions: Empty response from Groq");
    }

    try {
      const parsedContent = JSON.parse(content);
      return parsedContent.questions || [];
    } catch (error) {
      console.error("Failed to parse Groq response:", error);
      throw new Error("Failed to parse questions from Groq response");
    }
  } catch (error) {
    console.error("Error generating questions with Groq:", error);
    throw new Error(`Failed to generate interview questions: ${error}`);
  }
}

// Function to create avatar videos
async function createAvatarVideos(avatarId: string, questions: string[]): Promise<string[]> {
  try {
    const apiKey = process.env.GANAI_API_KEY;
    const videoIds: string[] = [];

    for (const question of questions) {
      const options = {
        method: 'POST',
        headers: {
          'ganos-api-key': apiKey || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          avatar_id: avatarId,
          title: `Interview Question ${new Date().toISOString()}`,
          text: question,
        })
      };

      const response = await fetch('https://os.gan.ai/v1/avatars/create_video', options);
      const data = await response.json();
      console.log(data);      
      if (!data.inference_id) {
        throw new Error(`Failed to create video for question: ${question.substring(0, 20)}...`);
      }
      
      videoIds.push(data.inference_id);
    }

    return videoIds;
  } catch (error) {
    console.error("Error creating avatar videos:", error);
    throw new Error(`Failed to create avatar videos: ${error}`);
  }
}

// Function to wait for video generation to complete
async function waitForVideos(videoIds: string[], avatarId: string): Promise<string[]> {
  try {
    const apiKey = process.env.GANAI_API_KEY;
    const MAX_RETRIES = 30;
    const RETRY_DELAY = 5000; // 5 seconds
    const videos: string[] = [];

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      // Wait for a while before checking
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Check if all videos are ready
      const options = { method: 'GET', headers: { 'ganos-api-key': apiKey || '' } };
      const response = await fetch(`https://os.gan.ai/v1/avatars/list_inferences?limit=10&avatar_id=${avatarId}`, options);
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        continue;
      }

      // Filter videos by our inference IDs 
      const ourVideos = data.data.filter((v: any) => videoIds.includes(v.inference_id));
      
      // Check if all are complete
      const allComplete = ourVideos.length === videoIds.length && 
                        ourVideos.every((v: any) => v.status === 'succeeded' && v.video);
      
      if (allComplete) {
        // Return the video URLs in the same order as the questions
        for (const id of videoIds) {
          const video = ourVideos.find((v: any) => v.inference_id === id);
          if (video && video.video) {
            videos.push(video.video);
          }
        }
        return videos;
      }
    }

    throw new Error("Timed out waiting for videos to be generated");
  } catch (error: any) {
    console.error("Error waiting for videos:", error);
    throw new Error(`Failed to wait for videos: ${error.message}`);
  }
}

// Function to download videos
async function downloadVideos(videoUrls: string[]): Promise<string[]> {
  try {
    // Generate a unique ID for this download operation
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const tempDir = path.join(process.cwd(), 'tmp');
    const downloadDir = path.join(tempDir, downloadId);
    await fs.mkdir(downloadDir, { recursive: true });
    
    const filePaths: string[] = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      const filePath = path.join(downloadDir, `question_${i + 1}.mp4`);
      
      // Download the file
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      
      filePaths.push(filePath);
    }
    
    return filePaths;
  } catch (error: any) {
    console.error("Error downloading videos:", error);
    throw new Error(`Failed to download videos: ${error.message}`);
  }
}

// Function to extract and prepare the nodding clip
async function prepareNoddingClip(timestamp: string, avatarId: string): Promise<string> {
  try {
    // Generate a unique ID for this operation
    const operationId = `nodding_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    const tempDir = path.join(process.cwd(), 'tmp');
    const noddingDir = path.join(tempDir, operationId);
    
    // Make sure the directory exists
    await fs.mkdir(noddingDir, { recursive: true });
    
    const apiKey = process.env.GANAI_API_KEY;
    if (!apiKey) {
      throw new Error("GANAI_API_KEY environment variable is not set");
    }
    
    const backendUrl = process.env.GANAI_BACKEND_URL || 'https://os.gan.ai';
    
    // Get list of avatars
    const response = await axios.get(`${backendUrl}/v1/avatars/list`, {
      headers: {
        'ganos-api-key': apiKey
      } 
    });
    
    const avatarsList = response.data?.avatars_list;
    if (!avatarsList || !Array.isArray(avatarsList)) {
      throw new Error("Failed to get avatars list or invalid response format");
    }
    
    // Find the avatar with the matching ID
    const filteredAvatars = avatarsList.filter((item: any) => item.avatar_id === avatarId);
    if (filteredAvatars.length === 0) {
      throw new Error(`No avatar found with ID: ${avatarId}`);
    }
    
    const url = filteredAvatars[0].base_video;
    if (!url) {
      throw new Error("Avatar does not have a base video");
    }
    
    // Download the base video
    console.log(`[${operationId}] Downloading base video from: ${url}`);
    const filePath = path.join(noddingDir, `base_video.mp4`);
    
    const videoResponse = await fetch(url);
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch base video: ${videoResponse.statusText}`);
    }
    
    const buffer = Buffer.from(await videoResponse.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    console.log(`[${operationId}] Base video downloaded to: ${filePath}`);

    const noddingClipPath = path.join(noddingDir, `nodding_clip.mp4`);
    const extendedNoddingClipPath = path.join(noddingDir, `nodding_extended.mp4`);
    
    // Extract the nodding clip
    console.log(`[${operationId}] Extracting clip at timestamp: ${timestamp}`);
    await execPromise(`ffmpeg -ss ${timestamp} -i "${filePath}" -t 10 -c copy "${noddingClipPath}"`);
    
    // Create a 30-second clip by concatenating the nodding clip three times
    const concatFilePath = path.join(noddingDir, 'concat_list.txt');
    await fs.writeFile(concatFilePath, `file '${noddingClipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'\nfile '${noddingClipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'\nfile '${noddingClipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);
    
    // Concatenate the clips
    console.log(`[${operationId}] Creating extended nodding clip`);
    await execPromise(`ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${extendedNoddingClipPath}"`);
    
    return extendedNoddingClipPath;
  } catch (error: any) {
    console.error("Error preparing nodding clip:", error);
    throw new Error(`Failed to prepare nodding clip: ${error.message}`);
  }
}


// Function to merge videos with nodding clips
async function mergeVideos(questionVideoPaths: string[], noddingClipPath: string): Promise<string> {
  try {
    const tempDir = path.join(process.cwd(), 'tmp');
    
    // Generate a unique ID for this merge operation
    const mergeId = `merge_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create a dedicated directory for this merge operation
    const mergeDir = path.join(tempDir, mergeId);
    await fs.mkdir(mergeDir, { recursive: true });
    
    const outputPath = path.join(mergeDir, `final_interview.mp4`);
    
    console.log(`[${mergeId}] Copying files to local directory for processing`);
    
    // Copy all input files to our merge directory to avoid path issues
    const localFiles: string[] = [];
    for (let i = 0; i < questionVideoPaths.length; i++) {
      const localPath = path.join(mergeDir, `question_${i}.mp4`);
      await fs.copyFile(questionVideoPaths[i], localPath);
      localFiles.push(localPath);
      
      // Add nodding clip after each question except the last one
      if (i < questionVideoPaths.length - 1) {
        const localNoddingPath = path.join(mergeDir, `nodding_${i}.mp4`);
        await fs.copyFile(noddingClipPath, localNoddingPath);
        localFiles.push(localNoddingPath);
      }
    }
    
    console.log(`[${mergeId}] Using filter_complex method to merge ${localFiles.length} videos`);
    
    // Build the complex filter for concatenation
    const inputs = localFiles.map(file => `-i "${file}"`).join(' ');
    let filterComplex = '';
    
    // Create the filtergraph for concatenation
    for (let i = 0; i < localFiles.length; i++) {
      try {
        // Check if the file has video and audio streams
        const { stdout } = await execPromise(`ffprobe -v error -show_entries stream=codec_type -of default=noprint_wrappers=1 "${localFiles[i]}"`);
        
        const hasVideo = stdout.includes('codec_type=video');
        const hasAudio = stdout.includes('codec_type=audio');
        
        if (hasVideo && hasAudio) {
          filterComplex += `[${i}:v:0][${i}:a:0]`;
        } else if (hasVideo) {
          // If the file has only video, create a silent audio stream
          filterComplex += `[${i}:v:0]aevalsrc=0:d=10[a${i}];[${i}:v:0][a${i}]`;
        } else {
          // Skip files that have neither video nor audio
          console.warn(`[${mergeId}] Skipping file ${localFiles[i]} - no video or audio streams detected`);
          continue;
        }
      } catch (error) {
        console.warn(`[${mergeId}] Error checking streams for ${localFiles[i]}, using defaults:`, error);
        filterComplex += `[${i}:v:0][${i}:a:0]`;
      }
    }
    
    filterComplex += `concat=n=${localFiles.length}:v=1:a=1[outv][outa]`;
    
    const command = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" "${outputPath}"`;
    console.log(`[${mergeId}] Executing command: ${command}`);
    
    try {
      await execPromise(command);
      console.log(`[${mergeId}] Successfully merged videos`);
    } catch (ffmpegError) {
      console.error(`[${mergeId}] Error during video merging:`, ffmpegError);
      
      // If complex filter fails, fall back to the simplest possible approach - just use the first video
      if (localFiles.length > 0) {
        console.log(`[${mergeId}] Falling back to using only the first video`);
        await fs.copyFile(localFiles[0], outputPath);
      } else {
        throw new Error("No valid video files to merge");
      }
    }
    
    return outputPath;
  } catch (error: any) {
    console.error("Error merging videos:", error);
    throw new Error(`Failed to merge videos: ${error.message}`);
  }
}

// Function to upload video to Cloudinary
async function uploadToCloudinary(videoPath: string): Promise<any> {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(videoPath, 
        { resource_type: "video", folder: "interviews" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  } catch (error: any) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error(`Failed to upload video to Cloudinary: ${error.message}`);
  }
}

// Clean up temporary files
async function cleanupTempFiles(filePaths: string[]): Promise<boolean> {
  try {
    // Keep track of directories to clean up
    const dirsToCleanup = new Set<string>();
    
    // First, try to delete the specific files
    for (const filePath of filePaths) {
      try {
        // Add the parent directory to our cleanup list
        const dirPath = path.dirname(filePath);
        if (dirPath.includes('tmp') && !dirPath.endsWith('tmp')) {
          dirsToCleanup.add(dirPath);
        }
        
        // Check if file exists before trying to delete it
        try {
          await fs.access(filePath, fs.constants.F_OK);
          await fs.unlink(filePath);
        } catch {
          // File doesn't exist, which is fine
          console.log(`File ${filePath} already deleted or doesn't exist`);
        }
      } catch (error) {
        console.warn(`Error during file cleanup (${filePath}):`, error);
        // Continue with other files even if one fails
      }
    }
    
    // Helper function to recursively delete a directory and all its contents
    async function removeDirectoryRecursive(dirPath: string): Promise<void> {
      try {
        // Read directory contents
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        // Process each entry
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            // Recursively delete subdirectories
            await removeDirectoryRecursive(fullPath);
          } else {
            // Delete files
            try {
              await fs.unlink(fullPath);
            } catch (err) {
              console.warn(`Failed to delete file ${fullPath}: ${err}`);
            }
          }
        }
        
        // Remove the now-empty directory
        try {
          await fs.rmdir(dirPath);
          console.log(`Successfully removed directory ${dirPath}`);
        } catch (err) {
          console.warn(`Failed to remove directory ${dirPath}: ${err}`);
        }
      } catch (err) {
        console.warn(`Error processing directory ${dirPath}: ${err}`);
      }
    }
    
    // Clean up directories recursively
    for (const dirPath of dirsToCleanup) {
      await removeDirectoryRecursive(dirPath).catch(err => {
        console.warn(`Failed to recursively remove directory ${dirPath}: ${err}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("Error cleaning up temp files:", error);
    return false;
  }
}

// Function to update interview with candidate video and generate summary
export async function processCandidateInterview(interviewId: string, videoBlob: Blob): Promise<{ success: boolean, error?: string }> {
  try {
    // Update the processing state
    await updateInterviewState(interviewId, 'PROCESSING_CANDIDATE_VIDEO');
    
    // Convert blob to buffer and save to temp file
    const arrayBuffer = await videoBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `candidate_interview_${interviewId}.webm`);
    
    await fs.writeFile(tempFilePath, buffer);
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(tempFilePath);
    
    // Update interview with candidate video URL
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        candidateVideoUrl: cloudinaryResult.secure_url,
        processingState: 'GENERATING_SUMMARY'
      }
    });
    
    // Generate transcript (in a real implementation, you would use a transcription service)
    // Here we're just mocking it for demonstration
    const transcript = await generateMockTranscript(interviewId);
    
    // Generate summary with Groq
    const summary = await generateInterviewSummary(transcript);
    
    // Update the interview with transcript and summary
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        candidateTranscript: transcript,
        interviewSummary: summary,
        processingState: 'COMPLETED',
        completedAt: new Date()
      }
    });
    
    // Clean up the temp file
    await fs.unlink(tempFilePath).catch(() => {});
    
    return { success: true };
  } catch (error) {
    console.error(`Error processing candidate interview ${interviewId}:`, error);
    await updateInterviewState(interviewId, 'FAILED');
    return { success: false };
  }
}

// Mock function to generate a transcript
async function generateMockTranscript(interviewId: string): Promise<string> {
  // In a real implementation, you would use a transcription service
  // For demonstration, we'll mock a transcript
  
  // Get the interview questions
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: { questions: true }
  });
  
  if (!interview) {
    throw new Error("Interview not found");
  }
  
  // Create a mock transcript with questions and hypothetical answers
  let transcript = "Interview Transcript:\n\n";
  
  for (const [index, question] of interview.questions.entries()) {
    transcript += `Interviewer: ${question}\n\n`;
    transcript += `Candidate: (Mock response to question ${index + 1})\n`;
    
    // Add some simulated responses
    switch (index) {
      case 0:
        transcript += "Hi there! Thanks for having me. I'm excited to be here. I have 5 years of experience in software development, specializing in full-stack web applications.\n\n";
        break;
      case 1:
        transcript += "I worked on a challenging project last year where we had to migrate a legacy system to a modern tech stack. We faced several issues with data migration but successfully implemented a phased approach that minimized downtime.\n\n";
        break;
      case 2:
        transcript += "For testing, I believe in a combination of unit tests and integration tests. I usually aim for at least 80% code coverage, and I make sure to document all APIs thoroughly with examples and edge cases.\n\n";
        break;
      case 3:
        transcript += "I've always valued teamwork. In my last role, I led a team of four developers on a project with tight deadlines. We implemented daily stand-ups and pair programming which significantly improved our productivity.\n\n";
        break;
      case 4:
        transcript += "Thank you for this opportunity. I enjoyed discussing my background and experience, and I look forward to potentially joining your team.\n\n";
        break;
    }
  }
  
  return transcript;
}

// Function to generate interview summary using Groq
async function generateInterviewSummary(transcript: string): Promise<string> {
  try {
    const prompt = `
      As an AI assistant, analyze this interview transcript and create a comprehensive summary.
      
      Focus on:
      1. Key strengths and qualifications of the candidate
      2. Technical skills demonstrated
      3. Communication skills
      4. Cultural fit indicators
      5. Areas for improvement
      6. Overall recommendation
      
      Format your response as a structured report that would be helpful for a hiring manager.
      
      Transcript:
      ${transcript}
    `;

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-70b-8192"
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to generate summary: Empty response from Groq");
    }

    return content;
  } catch (error: any) {
    console.error("Error generating interview summary with Groq:", error);
    throw new Error(`Failed to generate interview summary: ${error.message}`);
  }
}
