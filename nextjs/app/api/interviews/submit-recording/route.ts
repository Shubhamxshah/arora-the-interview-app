import { NextRequest, NextResponse } from "next/server";
import { processCandidateInterview } from "@/app/actions/interviewActions";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get('video');
    const interviewId = formData.get('interviewId');
    
    if (!videoFile || !(videoFile instanceof Blob) || !interviewId) {
      return NextResponse.json(
        { error: "Invalid submission" },
        { status: 400 }
      );
    }

    // Call the server action to process the interview
    const result = await processCandidateInterview(interviewId.toString(), videoFile);
    
    if (!result.success) {
      throw new Error(result.error || "Failed to process recording");
    }
    
    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error("Error submitting recording:", error);
    return NextResponse.json(
      { error: "Failed to submit recording" },
      { status: 500 }
    );
  }
}
