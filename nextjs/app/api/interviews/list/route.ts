import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
  
    console.log(user);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Get interviews created by this user
    const interviews = await prisma.interview.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(interviews)
    
    return NextResponse.json({
      interviews
    });
  } catch (error: any) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}
