import { beforeAll, describe, expect, it } from "vitest";
import { problems, sheets, topics } from "@dsarats/seed-data";
import { prisma } from "../src/db";
import { runSeed } from "../src/services/seed.service";

describe("seed catalog integrity", () => {
  it("has unique topic slugs", () => {
    const slugs = topics.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique problem slugs", () => {
    const slugs = problems.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("references only known topics from problems", () => {
    const known = new Set(topics.map((t) => t.slug));
    const unknown = problems.filter((p) => !known.has(p.topicSlug)).map((p) => p.slug);
    expect(unknown).toEqual([]);
  });

  it("references only known topics and problems from sheets, without duplicates", () => {
    const knownTopics = new Set(topics.map((t) => t.slug));
    const knownProblems = new Set(problems.map((p) => p.slug));

    for (const sheet of sheets) {
      const topicSlugs = sheet.topics.map((t) => t.topicSlug);
      expect(new Set(topicSlugs).size).toBe(topicSlugs.length);

      for (const topicSlug of topicSlugs) {
        expect(knownTopics.has(topicSlug)).toBe(true);
      }

      // A problem must not appear twice in the same sheet (unique(sheetId, problemId)).
      const problemSlugs = sheet.topics.flatMap((t) => t.problemSlugs);
      expect(new Set(problemSlugs).size).toBe(problemSlugs.length);

      for (const problemSlug of problemSlugs) {
        expect(knownProblems.has(problemSlug)).toBe(true);
      }
    }
  });
});

describe("runSeed", () => {
  beforeAll(async () => {
    // Converge the database with the catalog before asserting on stability.
    await runSeed(prisma);
  }, 180_000);

  it("is idempotent — a converged database is a no-op", async () => {
    const second = await runSeed(prisma);
    expect(second.writes).toBe(0);
  }, 180_000);

  it("stores every sheet's topics and problems in catalog order", async () => {
    for (const sheet of sheets) {
      const stored = await prisma.dSASheet.findUnique({
        where: { slug: sheet.slug },
        include: {
          topics: { orderBy: { position: "asc" }, include: { topic: { select: { slug: true } } } },
          problems: {
            orderBy: { position: "asc" },
            include: { problem: { select: { slug: true } } },
          },
        },
      });

      expect(stored, `sheet "${sheet.slug}" should be seeded`).not.toBeNull();
      expect(stored!.isPublished).toBe(true);

      expect(stored!.topics.map((st) => st.topic.slug)).toEqual(
        sheet.topics.map((st) => st.topicSlug),
      );
      expect(stored!.problems.map((sp) => sp.problem.slug)).toEqual(
        sheet.topics.flatMap((st) => st.problemSlugs),
      );
    }
  }, 60_000);

  it("publishes the whole problem catalog", async () => {
    const catalogSlugs = problems.map((p) => p.slug);
    const unpublished = await prisma.problem.findMany({
      where: { slug: { in: catalogSlugs }, isPublished: false },
      select: { slug: true },
    });
    expect(unpublished).toEqual([]);
  }, 60_000);
});
