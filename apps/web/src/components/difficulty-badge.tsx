import type { Difficulty } from "@dsarats/shared";
import { Badge } from "@/components/ui/badge";

const LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

// Difficulty is always spelled out, never conveyed by color alone (WCAG 2.1 AA).
const TONE: Record<Difficulty, "success" | "accent" | "error"> = {
  EASY: "success",
  MEDIUM: "accent",
  HARD: "error",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge tone={TONE[difficulty]}>{LABEL[difficulty]}</Badge>;
}
