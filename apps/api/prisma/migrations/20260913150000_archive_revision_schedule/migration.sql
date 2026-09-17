-- Mastering a problem must not erase its revision history (plan §4.4 allows archiving
-- for history). Existing rows are all active, so a nullable column needs no backfill.

-- AlterTable
ALTER TABLE "RevisionSchedule" ADD COLUMN     "archivedAt" TIMESTAMP(3);
