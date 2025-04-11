import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const apiKey = process.env.GANAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }
    
    const options = { 
      method: 'GET', 
      headers: { 'ganos-api-key': apiKey }
    };
    
    const response = await fetch('https://os.gan.ai/v1/avatars/list', options);
    const data = await response.json();
   
    console.log(data);

    return NextResponse.json({
      avatars: data.avatars_list || []
    });
  } catch (error: any) {
    console.error("Error fetching avatars:", error);
    return NextResponse.json(
      { error: "Failed to fetch avatars" },
      { status: 500 }
    );
  }
}
