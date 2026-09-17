import type { Note } from "@prisma/client";
import type { NoteDto, NoteResponse, NoteUpsertInput } from "@dsarats/shared";
import { prisma } from "../db";
import { ApiError } from "./auth.service";

function toNoteDto(note: Note): NoteDto {
  return {
    problemId: note.problemId,
    approach: note.approach,
    mistakes: note.mistakes,
    optimalApproach: note.optimalApproach,
    revisionNotes: note.revisionNotes,
    keyPatterns: note.keyPatterns,
    updatedAt: note.updatedAt.toISOString(),
  };
}

async function assertProblemExists(problemId: string): Promise<void> {
  const problem = await prisma.problem.findUnique({ where: { id: problemId }, select: { id: true } });
  if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem not found");
}

/** The user's notebook entry for a problem, or null when they have not written one. */
export async function getNote(userId: string, problemId: string): Promise<NoteResponse> {
  await assertProblemExists(problemId);

  const note = await prisma.note.findUnique({
    where: { userId_problemId: { userId, problemId } },
  });
  return { note: note ? toNoteDto(note) : null };
}

/**
 * Upsert a notebook entry.
 *
 * Only the fields present in the body are touched: `undefined` leaves a field as-is and
 * `null` clears it, so the client can autosave one field at a time without clobbering
 * the others (plan §5.4).
 *
 * Deliberately does NOT log a NOTE_UPDATED activity row — autosave fires often and would
 * flood the activity log for no user benefit.
 */
export async function upsertNote(
  userId: string,
  problemId: string,
  input: NoteUpsertInput,
): Promise<NoteResponse> {
  await assertProblemExists(problemId);

  const note = await prisma.note.upsert({
    where: { userId_problemId: { userId, problemId } },
    create: { userId, problemId, ...input },
    update: { ...input },
  });

  return { note: toNoteDto(note) };
}
