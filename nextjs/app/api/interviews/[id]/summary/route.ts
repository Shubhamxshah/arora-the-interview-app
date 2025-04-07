import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface SummaryParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: SummaryParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Get the interview with summary
    const interview = await prisma.interview.findFirst({
      where: { 
        id,
        creatorId: user.id
      },
      select: {
        id: true,
        candidateEmail: true,
        processingState: true,
        candidateVideoUrl: true,
        candidateTranscript: true,
        interviewSummary: true,
        questions: true,
        completedAt: true
      }
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found or you don't have access" },
        { status: 404 }
      );
    }
    
    if (interview.processingState !== 'COMPLETED') {
      return NextResponse.json(
        { error: "Interview summary not yet available" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      interview
    });
  } catch (error: any) {
    console.error("Error fetching interview summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview summary" },
      { status: 500 }
    );
  }
}
