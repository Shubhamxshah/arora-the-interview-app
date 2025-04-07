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
  } catch (error: any) {
    console.error("Error creating interview:", error);
    return {
      success: false,
      error: error.message
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
  try {
    // Get the interview details
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      throw new Error("Interview not found");
    }

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

    // Step 2: Create avatar videos
    const videoIds = await createAvatarVideos(interview.avatarId, questions);

    // Step 3: Wait for videos to be processed
// Update the interview state
    await updateInterviewState(interviewId, 'PROCESSING_VIDEOS');

    // Step 3: Wait for videos to be processed
    const videoUrls = await waitForVideos(videoIds);

    // Step 4: Download the videos
    const videoFilePaths = await downloadVideos(videoUrls);

    // Step 5: Extract and prepare the nodding clip
    await updateInterviewState(interviewId, 'MERGING_VIDEOS');
    const noddingClipPath = await prepareNoddingClip(interview.timestamp);

    // Step 6: Merge all videos with nodding clips in between
    const finalVideoPath = await mergeVideos(videoFilePaths, noddingClipPath);

    // Step 7: Upload to Cloudinary
    await updateInterviewState(interviewId, 'UPLOADING_VIDEO');
    const cloudinaryResult = await uploadToCloudinary(finalVideoPath);

    // Step 8: Update the interview with the video URL
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        interviewVideoUrl: cloudinaryResult.secure_url,
        interviewThumbnailUrl: cloudinaryResult.secure_url.replace(/\.[^/.]+$/, ".jpg"),
        processingState: 'READY_FOR_CANDIDATE'
      }
    });

    // Step 9: Clean up temporary files
    const filesToCleanup = [...videoFilePaths, noddingClipPath, finalVideoPath];
    await cleanupTempFiles(filesToCleanup);
  } catch (error: any) {
    console.error(`Error processing interview ${interviewId}:`, error);
    await updateInterviewState(interviewId, 'FAILED');
  }
}

// Function to generate interview questions using Groq
async function generateInterviewQuestions(resumeText: string, jobDescription: string): Promise<string[]> {
  try {
    const prompt = `
      I have a candidate's resume and a job description. Based on these, generate 5 interview questions:
      
      1. A friendly introduction question (start with "Hi there! Hope you're well.")
      2. Three technical or experience-based questions that match the candidate's skills with the job requirements
      3. A friendly conclusion (end with "That's all we had for today. Congratulations on completing the interview successfully!")
      
      Format the output as a JSON array of 5 strings, one for each question. Keep each question under 30 words.
      
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
      model: "llama-3.1-70b-versatile",
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
  } catch (error: any) {
    console.error("Error generating questions with Groq:", error);
    throw new Error(`Failed to generate interview questions: ${error.message}`);
  }
}

// Function to create avatar videos
async function createAvatarVideos(avatarId: string, questions: string[]): Promise<string[]> {
  try {
    const apiKey = process.env.GANOS_API_KEY;
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
          audio_url: ""
        })
      };

      const response = await fetch('https://os.gan.ai/v1/avatars/create_video', options);
      const data = await response.json();
      
      if (!data.inference_id) {
        throw new Error(`Failed to create video for question: ${question.substring(0, 20)}...`);
      }
      
      videoIds.push(data.inference_id);
    }

    return videoIds;
  } catch (error: any) {
    console.error("Error creating avatar videos:", error);
    throw new Error(`Failed to create avatar videos: ${error.message}`);
  }
}

// Function to wait for video generation to complete
async function waitForVideos(videoIds: string[]): Promise<string[]> {
  try {
    const apiKey = process.env.GANOS_API_KEY;
    const MAX_RETRIES = 30;
    const RETRY_DELAY = 5000; // 5 seconds
    const videos: string[] = [];

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      // Wait for a while before checking
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Check if all videos are ready
      const options = { method: 'GET', headers: { 'ganos-api-key': apiKey || '' } };
      const response = await fetch('https://os.gan.ai/v1/avatars/list_inferences', options);
      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        continue;
      }

      // Filter videos by our inference IDs
      const ourVideos = data.data.filter((v: any) => videoIds.includes(v.inference_id));
      
      // Check if all are complete
      const allComplete = ourVideos.length === videoIds.length && 
                        ourVideos.every((v: any) => v.status === 'completed' && v.video);
      
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
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const filePaths: string[] = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      const filePath = path.join(tempDir, `question_${i + 1}.mp4`);
      
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
async function prepareNoddingClip(timestamp: string): Promise<string> {
  try {
    const tempDir = path.join(process.cwd(), 'tmp');
    
    // Use a sample video for the nodding clip (in production, you would use a real video)
    // For this example, we're assuming there's a video file to extract from
    const sourceVideo = process.env.SOURCE_VIDEO_PATH || path.join(process.cwd(), 'public', 'sample_video.mp4');
    
    const noddingClipPath = path.join(tempDir, `nodding_clip.mp4`);
    const extendedNoddingClipPath = path.join(tempDir, `nodding_extended.mp4`);
    
    // Extract the nodding clip
    await execPromise(`ffmpeg -ss ${timestamp} -i "${sourceVideo}" -t 10 -c copy "${noddingClipPath}"`);
    
    // Create a 30-second clip by concatenating the nodding clip three times
    // Create a file list for ffmpeg concat
    const concatFilePath = path.join(tempDir, 'concat_list.txt');
    await fs.writeFile(concatFilePath, `file '${noddingClipPath}'\nfile '${noddingClipPath}'\nfile '${noddingClipPath}'`);
    
    // Concatenate the clips
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
    const outputPath = path.join(tempDir, `final_interview.mp4`);
    
    // Create a file list for ffmpeg concat that alternates between question videos and nodding clips
    const concatFilePath = path.join(tempDir, 'final_concat_list.txt');
    let concatContent = '';
    
    for (let i = 0; i < questionVideoPaths.length; i++) {
      concatContent += `file '${questionVideoPaths[i]}'\n`;
      
      // Add nodding clip after each question except the last one
      if (i < questionVideoPaths.length - 1) {
        concatContent += `file '${noddingClipPath}'\n`;
      }
    }
    
    await fs.writeFile(concatFilePath, concatContent);
    
    // Merge all videos
    await execPromise(`ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`);
    
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
    for (const filePath of filePaths) {
      await fs.unlink(filePath).catch(() => {});
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
  } catch (error: any) {
    console.error(`Error processing candidate interview ${interviewId}:`, error);
    await updateInterviewState(interviewId, 'FAILED');
    return { success: false, error: error.message };
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
      model: "llama-3.1-70b-versatile"
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
