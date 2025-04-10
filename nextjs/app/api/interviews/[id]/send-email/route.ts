import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Instead of setting host manually
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || ""  // This should be your App Password
  },
  secure: true,  // Use SSL
  // Required for Gmail from localhost
  tls: {
    rejectUnauthorized: false
  }
});

interface EmailParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, { params }: EmailParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Get the interview
    const interview = await prisma.interview.findUnique({
      where: { id }
    });
    
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }
    
    // Check if the interview is ready
    if (interview.processingState !== 'READY_FOR_CANDIDATE') {
      return NextResponse.json(
        { error: "This interview is not ready to send" },
        { status: 400 }
      );
    }
    
    // Send email
    const interviewLink = `${process.env.NEXT_PUBLIC_APP_URL}/interview?token=${interview.candidateToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "interviews@example.com",
      to: interview.candidateEmail,
      subject: "Your AI Interview is Ready",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your AI Interview is Ready</h2>
          <p>Hello,</p>
          <p>Your AI interview has been prepared and is now ready for you to complete.</p>
          <p>Please click the link below to start your interview:</p>
          <p style="margin: 20px 0;">
            <a href="${interviewLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Interview
            </a>
          </p>
          <p><strong>Important Tips:</strong></p>
          <ul>
            <li>Find a quiet place with good lighting</li>
            <li>Test your camera and microphone before starting</li>
            <li>Dress professionally as you would for an in-person interview</li>
            <li>The interview will take approximately 15-20 minutes</li>
          </ul>
          <p>Good luck!</p>
          <p>Best regards,<br>The Interview Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    // Mark email as sent
    await prisma.interview.update({
      where: { id },
      data: {
        emailSent: true,
        emailSentAt: new Date()
      }
    });
    
    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
