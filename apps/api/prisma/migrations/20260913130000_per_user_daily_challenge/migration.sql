-- Phase 4 correction: the daily challenge is personal ("chosen from your weak topics"),
-- so a row is now owned by a user and unique per (user, local date) instead of globally.
--
-- Existing rows were the previous global rotation and have no meaningful owner; they
-- cannot satisfy the new NOT NULL userId, so they (and their completions, via cascade)
-- are cleared. This is dev/test data only.

DELETE FROM "DailyChallengeCompletion";
DELETE FROM "DailyChallenge";

-- DropIndex
DROP INDEX "DailyChallenge_date_key";

-- AlterTable
ALTER TABLE "DailyChallenge" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallenge_userId_date_key" ON "DailyChallenge"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyChallenge" ADD CONSTRAINT "DailyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
