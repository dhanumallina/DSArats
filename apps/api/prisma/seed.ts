import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/services/seed.service";

// Thin CLI wrapper — the seed logic lives in src/services/seed.service.ts so it is
// typechecked and covered by tests. Run with `npm run seed` / `npx prisma db seed`.
const prisma = new PrismaClient();

runSeed(prisma)
  .then((summary) => {
    console.log(
      `✔ seed complete — ${summary.writes} write${summary.writes === 1 ? "" : "s"} ` +
        `(topics ${summary.topicsCreated} new / ${summary.topicsUpdated} updated, ` +
        `problems ${summary.problemsCreated} new / ${summary.problemsUpdated} updated, ` +
        `sheets ${summary.sheetsCreated} new / ${summary.sheetsUpdated} updated, ` +
        `topic groups rebuilt ${summary.sheetTopicsRebuilt}, ` +
        `problem membership rebuilt ${summary.sheetProblemsRebuilt})`,
    );
    if (summary.writes === 0) {
      console.log("✔ database already in sync — no changes needed");
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
