import { NextRequest, NextResponse } from "next/server";
import { ProcessingState } from "@prisma/client";
import  { prisma } from "@/lib/prisma"

interface UpdateParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, { params }: UpdateParams) {
  try {
    const { id } = await params;
    const { state } = await req.json();
    
    if (!Object.values(ProcessingState).includes(state as ProcessingState)) {
      return NextResponse.json(
        { error: "Invalid state" },
        { status: 400 }
      );
    }
    
    // Update the interview state
    await prisma.interview.update({
      where: { id },
      data: { 
        processingState: state as ProcessingState,
        candidateJoined: state === 'WAITING_FOR_CANDIDATE' ? true : undefined
      }
    });
    
    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error("Error updating interview state:", error);
    return NextResponse.json(
      { error: "Failed to update interview state" },
      { status: 500 }
    );
  }
}
