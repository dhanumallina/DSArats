export interface SeedTopic {
  slug: string;
  name: string;
  description: string;
  order: number;
  iconKey?: string;
}

export const topics: SeedTopic[] = [
  { slug: "dsa-foundations", name: "DSA Foundations", description: "Core concepts, recursion, and complexity thinking.", order: 1, iconKey: "book-open" },
  { slug: "arrays-hashing", name: "Arrays & Hashing", description: "Indexing, iteration, and hash-based lookups.", order: 2, iconKey: "hash" },
  { slug: "two-pointers", name: "Two Pointers", description: "Linear scans from both ends or at different speeds.", order: 3, iconKey: "move-horizontal" },
  { slug: "sliding-window", name: "Sliding Window", description: "Contiguous subarray problems over a moving window.", order: 4, iconKey: "scan" },
  { slug: "binary-search", name: "Binary Search", description: "Halving the search space on sorted or monotonic data.", order: 5, iconKey: "search" },
  { slug: "sorting", name: "Sorting", description: "Ordering techniques and their guarantees.", order: 6, iconKey: "arrow-up-down" },
  { slug: "linked-lists", name: "Linked Lists", description: "Pointer-chasing structures and classic pointer tricks.", order: 7, iconKey: "link" },
  { slug: "stacks-queues", name: "Stacks & Queues", description: "LIFO/FIFO structures and monotonic patterns.", order: 8, iconKey: "layers" },
  { slug: "trees", name: "Trees", description: "Binary trees, BSTs, and tree traversals.", order: 9, iconKey: "git-branch" },
  { slug: "tries", name: "Tries", description: "Prefix trees for string matching and autocomplete.", order: 10, iconKey: "network" },
  { slug: "heaps", name: "Heaps & Priority Queues", description: "Efficient min/max extraction and top-k problems.", order: 11, iconKey: "bar-chart" },
  { slug: "backtracking", name: "Backtracking", description: "Systematic search over decision spaces.", order: 12, iconKey: "undo-2" },
  { slug: "graphs", name: "Graphs", description: "BFS/DFS, connectivity, and graph modeling.", order: 13, iconKey: "share-2" },
  { slug: "dynamic-programming", name: "Dynamic Programming", description: "Optimal substructure and overlapping subproblems.", order: 14, iconKey: "zap" },
  { slug: "intervals", name: "Intervals", description: "Merging, overlapping, and scheduling intervals.", order: 15, iconKey: "calendar-range" },
  { slug: "matrix", name: "Matrix", description: "2D grid traversals and in-place transforms.", order: 16, iconKey: "grid-3x3" },
  { slug: "bit-manipulation", name: "Bit Manipulation", description: "Working directly with binary representations.", order: 17, iconKey: "binary" },
  { slug: "strings", name: "Strings", description: "Text processing, palindromes, and encoding.", order: 18, iconKey: "type" },
];