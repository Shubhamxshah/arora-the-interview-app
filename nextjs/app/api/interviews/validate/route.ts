import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }
    
    // Find the interview with this token
    const interview = await prisma.interview.findUnique({
      where: { candidateToken: token },
      select: {
        id: true,
        processingState: true,
        candidateJoined: true,
        interviewVideoUrl: true,
        questions: true
      }
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }
    
    // Check if the interview is ready
    if (interview.processingState !== 'READY_FOR_CANDIDATE' && 
        interview.processingState !== 'WAITING_FOR_CANDIDATE') {
      return NextResponse.json(
        { error: "This interview is not yet ready" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      interview
    });
  } catch (error: any) {
    console.error("Error validating interview:", error);
    return NextResponse.json(
      { error: "Failed to validate interview" },
      { status: 500 }
    );
  }
}
