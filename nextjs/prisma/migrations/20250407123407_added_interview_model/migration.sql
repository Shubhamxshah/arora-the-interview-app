-- CreateEnum
CREATE TYPE "ProcessingState" AS ENUM ('CREATING_QUESTIONS', 'GENERATING_VIDEOS', 'PROCESSING_VIDEOS', 'MERGING_VIDEOS', 'UPLOADING_VIDEO', 'READY_FOR_CANDIDATE', 'WAITING_FOR_CANDIDATE', 'CANDIDATE_COMPLETED', 'PROCESSING_CANDIDATE_VIDEO', 'GENERATING_SUMMARY', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "candidateEmail" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "questions" TEXT[],
    "processingState" "ProcessingState" NOT NULL DEFAULT 'CREATING_QUESTIONS',
    "interviewVideoUrl" TEXT,
    "interviewThumbnailUrl" TEXT,
    "candidateToken" TEXT NOT NULL,
    "candidateJoined" BOOLEAN NOT NULL DEFAULT false,
    "candidateVideoUrl" TEXT,
    "candidateTranscript" TEXT,
    "interviewSummary" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interview_candidateToken_key" ON "Interview"("candidateToken");

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
