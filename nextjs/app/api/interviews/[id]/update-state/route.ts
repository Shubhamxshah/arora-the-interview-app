import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, ProcessingState } from "@prisma/client";

const prisma = new PrismaClient();

interface UpdateParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: UpdateParams) {
  try {
    const { id } = params;
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
