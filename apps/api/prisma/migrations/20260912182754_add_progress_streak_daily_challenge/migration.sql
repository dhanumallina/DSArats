-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('NOT_STARTED', 'ATTEMPTED', 'SOLVED', 'NEEDS_REVISION', 'REVISED', 'MASTERED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PROBLEM_SOLVED', 'PROBLEM_ATTEMPTED', 'REVISION_COMPLETED', 'DAILY_CHALLENGE', 'NOTE_UPDATED', 'LEARNING_SESSION');

-- CreateEnum
CREATE TYPE "DailyChallengeStatus" AS ENUM ('SOLVED', 'ATTEMPTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "UserProblem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" "ProblemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "firstSolvedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "solveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "refId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeDate" DATE NOT NULL,
    "activityTypes" TEXT[],
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "problemId" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallengeCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "status" "DailyChallengeStatus" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProblem_userId_status_idx" ON "UserProblem"("userId", "status");

-- CreateIndex
CREATE INDEX "UserProblem_userId_lastActivityAt_idx" ON "UserProblem"("userId", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProblem_userId_problemId_key" ON "UserProblem"("userId", "problemId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_occurredAt_idx" ON "ActivityLog"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_type_idx" ON "ActivityLog"("userId", "type");

-- CreateIndex
CREATE INDEX "StreakRecord_userId_activeDate_idx" ON "StreakRecord"("userId", "activeDate");

-- CreateIndex
CREATE UNIQUE INDEX "StreakRecord_userId_activeDate_key" ON "StreakRecord"("userId", "activeDate");

-- CreateIndex
CREATE INDEX "DailyChallenge_problemId_idx" ON "DailyChallenge"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_date_key" ON "DailyChallenge"("date");

-- CreateIndex
CREATE INDEX "DailyChallengeCompletion_userId_completedAt_idx" ON "DailyChallengeCompletion"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeCompletion_userId_challengeId_key" ON "DailyChallengeCompletion"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "UserProblem" ADD CONSTRAINT "UserProblem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblem" ADD CONSTRAINT "UserProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakRecord" ADD CONSTRAINT "StreakRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
