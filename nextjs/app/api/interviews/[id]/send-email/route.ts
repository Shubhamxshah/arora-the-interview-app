import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || ""
  }
});

interface EmailParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: EmailParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { id } = params;
    
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
