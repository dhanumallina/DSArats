import type { PrismaClient } from "@prisma/client";
import {
  problems as seedProblems,
  sheets as seedSheets,
  topics as seedTopics,
} from "@dsarats/seed-data";

export interface SeedSummary {
  /** Total rows created, updated, or rebuilt. A database already in sync reports 0. */
  writes: number;
  topicsCreated: number;
  topicsUpdated: number;
  problemsCreated: number;
  problemsUpdated: number;
  sheetsCreated: number;
  sheetsUpdated: number;
  sheetTopicsRebuilt: number;
  sheetProblemsRebuilt: number;
  problemsPublished: number;
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Idempotent, diff-based content seed.
 *
 * Only rows that actually differ are written — a database already in sync is a no-op.
 * Sheet membership is rebuilt with `createMany` instead of one insert per row, which
 * keeps repeat runs (CI, local setup) cheap against a remote database.
 *
 * Content is public metadata only (titles, difficulty, topics, official links) — no
 * copied explanations or paid content.
 */
export async function runSeed(prisma: PrismaClient): Promise<SeedSummary> {
  const summary: SeedSummary = {
    writes: 0,
    topicsCreated: 0,
    topicsUpdated: 0,
    problemsCreated: 0,
    problemsUpdated: 0,
    sheetsCreated: 0,
    sheetsUpdated: 0,
    sheetTopicsRebuilt: 0,
    sheetProblemsRebuilt: 0,
    problemsPublished: 0,
  };

  // ── Topics ────────────────────────────────────────────────────────────────
  const existingTopics = await prisma.topic.findMany();
  const topicIdBySlug = new Map<string, string>();

  for (const topic of seedTopics) {
    const fields = {
      name: topic.name,
      description: topic.description,
      order: topic.order,
      iconKey: topic.iconKey ?? null,
    };
    const existing = existingTopics.find((t) => t.slug === topic.slug);

    if (!existing) {
      const created = await prisma.topic.create({ data: { slug: topic.slug, ...fields } });
      topicIdBySlug.set(topic.slug, created.id);
      summary.topicsCreated++;
      summary.writes++;
      continue;
    }

    topicIdBySlug.set(topic.slug, existing.id);
    if (
      existing.name !== fields.name ||
      existing.description !== fields.description ||
      existing.order !== fields.order ||
      existing.iconKey !== fields.iconKey
    ) {
      await prisma.topic.update({ where: { id: existing.id }, data: fields });
      summary.topicsUpdated++;
      summary.writes++;
    }
  }

  // ── Problems ──────────────────────────────────────────────────────────────
  const existingProblems = await prisma.problem.findMany();
  const problemIdBySlug = new Map<string, string>();

  for (const problem of seedProblems) {
    const topicId = topicIdBySlug.get(problem.topicSlug);
    if (!topicId) {
      throw new Error(`seed: unknown topic "${problem.topicSlug}" for problem "${problem.slug}"`);
    }

    const fields = {
      title: problem.title,
      difficulty: problem.difficulty,
      topicId,
      pattern: problem.pattern ?? null,
      platform: problem.platform,
      externalId: problem.externalId,
      platformProblemUrl: problem.platformProblemUrl,
      solutionUrl: problem.solutionUrl ?? null,
      tags: problem.tags,
      estimatedMinutes: problem.estimatedMinutes,
      timeComplexityHint: problem.timeComplexityHint ?? null,
      spaceComplexityHint: problem.spaceComplexityHint ?? null,
      isPublished: true,
    };
    const existing = existingProblems.find((p) => p.slug === problem.slug);

    if (!existing) {
      const created = await prisma.problem.create({ data: { slug: problem.slug, ...fields } });
      problemIdBySlug.set(problem.slug, created.id);
      summary.problemsCreated++;
      summary.writes++;
      continue;
    }

    problemIdBySlug.set(problem.slug, existing.id);
    const changed =
      existing.title !== fields.title ||
      existing.difficulty !== fields.difficulty ||
      existing.topicId !== fields.topicId ||
      existing.pattern !== fields.pattern ||
      existing.platform !== fields.platform ||
      existing.externalId !== fields.externalId ||
      existing.platformProblemUrl !== fields.platformProblemUrl ||
      existing.solutionUrl !== fields.solutionUrl ||
      !sameStringArray(existing.tags, fields.tags) ||
      existing.estimatedMinutes !== fields.estimatedMinutes ||
      existing.timeComplexityHint !== fields.timeComplexityHint ||
      existing.spaceComplexityHint !== fields.spaceComplexityHint ||
      !existing.isPublished;

    if (changed) {
      await prisma.problem.update({ where: { id: existing.id }, data: fields });
      summary.problemsUpdated++;
      summary.writes++;
    }
  }

  // ── Sheets: the sheet row, its topic grouping, and its problem ordering ────
  const existingSheets = await prisma.dSASheet.findMany({
    include: {
      topics: { orderBy: { position: "asc" } },
      problems: { orderBy: { position: "asc" } },
    },
  });

  for (const sheet of seedSheets) {
    const fields = {
      name: sheet.name,
      description: sheet.description,
      difficulty: sheet.difficulty,
      estimatedHours: sheet.estimatedHours,
      sourceAttribution: sheet.sourceAttribution ?? null,
      isPublished: true,
    };

    const existing = existingSheets.find((s) => s.slug === sheet.slug);
    let sheetId: string;

    if (!existing) {
      const created = await prisma.dSASheet.create({ data: { slug: sheet.slug, ...fields } });
      sheetId = created.id;
      summary.sheetsCreated++;
      summary.writes++;
    } else {
      sheetId = existing.id;
      const changed =
        existing.name !== fields.name ||
        existing.description !== fields.description ||
        existing.difficulty !== fields.difficulty ||
        existing.estimatedHours !== fields.estimatedHours ||
        existing.sourceAttribution !== fields.sourceAttribution ||
        !existing.isPublished;

      if (changed) {
        await prisma.dSASheet.update({ where: { id: sheetId }, data: fields });
        summary.sheetsUpdated++;
        summary.writes++;
      }
    }

    // Topic grouping — rebuilt only when the desired order differs from the current one.
    const desiredTopicIds = sheet.topics.map((st) => {
      const topicId = topicIdBySlug.get(st.topicSlug);
      if (!topicId) throw new Error(`seed: unknown sheet topic "${st.topicSlug}" in "${sheet.slug}"`);
      return topicId;
    });
    const currentTopicIds = existing?.topics.map((st) => st.topicId) ?? [];

    if (!sameStringArray(currentTopicIds, desiredTopicIds)) {
      await prisma.sheetTopic.deleteMany({ where: { sheetId } });
      if (desiredTopicIds.length > 0) {
        await prisma.sheetTopic.createMany({
          data: desiredTopicIds.map((topicId, position) => ({ sheetId, topicId, position })),
        });
      }
      summary.sheetTopicsRebuilt++;
      summary.writes++;
    }

    // Problem membership — order plus `isCore` (every Blind 75 problem is core, per the catalog).
    const isCore = sheet.slug === "blind-75";
    const desiredMembers = sheet.topics.flatMap((st) =>
      st.problemSlugs.map((slug) => {
        const problemId = problemIdBySlug.get(slug);
        if (!problemId) throw new Error(`seed: unknown problem "${slug}" in sheet "${sheet.slug}"`);
        return { problemId, isCore };
      }),
    );
    const currentMembers = existing?.problems.map((sp) => ({
      problemId: sp.problemId,
      isCore: sp.isCore,
    })) ?? [];

    const membershipMatches =
      currentMembers.length === desiredMembers.length &&
      currentMembers.every(
        (member, i) =>
          member.problemId === desiredMembers[i]!.problemId && member.isCore === desiredMembers[i]!.isCore,
      );

    if (!membershipMatches) {
      await prisma.sheetProblem.deleteMany({ where: { sheetId } });
      if (desiredMembers.length > 0) {
        await prisma.sheetProblem.createMany({
          data: desiredMembers.map((member, position) => ({
            sheetId,
            problemId: member.problemId,
            position,
            isCore: member.isCore,
          })),
        });
      }
      summary.sheetProblemsRebuilt++;
      summary.writes++;
    }
  }

  // ── Publish catalog problems that belong to no sheet ──────────────────────
  // Scoped to catalog slugs so rows created through the admin API are never touched.
  const assignedSlugs = new Set<string>();
  for (const sheet of seedSheets) {
    for (const st of sheet.topics) for (const slug of st.problemSlugs) assignedSlugs.add(slug);
  }
  const unassignedCatalogSlugs = seedProblems
    .map((p) => p.slug)
    .filter((slug) => !assignedSlugs.has(slug));

  if (unassignedCatalogSlugs.length > 0) {
    const published = await prisma.problem.updateMany({
      where: { slug: { in: unassignedCatalogSlugs }, isPublished: false },
      data: { isPublished: true },
    });
    summary.problemsPublished = published.count;
    summary.writes += published.count;
  }

  return summary;
}
