"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import type { NoteDto, NoteResponse } from "@dsarats/shared";
import { apiFetch, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FIELDS = [
  { key: "approach", label: "Approach", hint: "How you thought about it" },
  { key: "mistakes", label: "Mistakes", hint: "What tripped you up" },
  { key: "optimalApproach", label: "Optimal approach", hint: "The cleanest solution you found" },
  { key: "revisionNotes", label: "Revision notes", hint: "What to remember next time" },
  { key: "keyPatterns", label: "Key patterns", hint: "Patterns this problem unlocks" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type NoteValues = Record<FieldKey, string>;

function toValues(note: NoteDto | null): NoteValues {
  return {
    approach: note?.approach ?? "",
    mistakes: note?.mistakes ?? "",
    optimalApproach: note?.optimalApproach ?? "",
    revisionNotes: note?.revisionNotes ?? "",
    keyPatterns: note?.keyPatterns ?? "",
  };
}

/**
 * The form itself. Mounted only once the note is loaded (or known absent), so its state
 * can initialize straight from the server values — no effect-based syncing.
 */
function NotebookForm({ problemId, initial }: { problemId: string; initial: NoteValues }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);

  const save = useMutation({
    mutationFn: ({ field, value }: { field: FieldKey; value: string }) =>
      apiFetch<NoteResponse>(`/problems/${problemId}/notes`, {
        method: "PUT",
        // null clears the field; the API leaves every other field untouched.
        body: { [field]: value.trim() === "" ? null : value },
      }),
    onSuccess: (res, variables) => {
      setSaved((prev) => ({ ...prev, [variables.field]: variables.value }));
      // Keep the cached note in step so remounting the form can't rehydrate stale text.
      queryClient.setQueryData<NoteResponse>(["note", problemId], res);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  function handleBlur(field: FieldKey) {
    if (values[field] === saved[field]) return;
    save.mutate({ field, value: values[field] });
  }

  return (
    <>
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label htmlFor={`note-${field.key}`} className="text-sm font-medium text-foreground">
            {field.label}
          </label>
          <textarea
            id={`note-${field.key}`}
            value={values[field.key]}
            placeholder={field.hint}
            rows={3}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
            }
            onBlur={() => handleBlur(field.key)}
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted transition-colors duration-150 hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
        </div>
      ))}
      <p aria-live="polite" className="text-xs text-muted">
        {save.isPending
          ? "Saving…"
          : save.isError
            ? "Couldn't save — try again"
            : "Notes save automatically when you leave a field. Only you can see them."}
      </p>
    </>
  );
}

export function Notebook({ problemId }: { problemId: string }) {
  const notes = useQuery({
    queryKey: ["note", problemId],
    queryFn: () => apiFetch<NoteResponse>(`/problems/${problemId}/notes`),
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-4 text-accent" aria-hidden />
          Notebook
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notes.isLoading ? (
          <Skeleton lines={4} />
        ) : notes.isError ? (
          <p className="text-sm text-muted">
            We couldn&apos;t load your notes right now. Reload the page to try again.
          </p>
        ) : (
          <NotebookForm problemId={problemId} initial={toValues(notes.data?.note ?? null)} />
        )}
      </CardContent>
    </Card>
  );
}
