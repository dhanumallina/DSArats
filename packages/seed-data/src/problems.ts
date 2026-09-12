// Seed content for DSARats (Phase 3, per approved decision D5).
// Only public problem metadata (title, difficulty, topic, official platform link)
// is stored — no copied explanations, paid content, or proprietary text.

export type SeedDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface SeedProblem {
  slug: string;
  title: string;
  difficulty: SeedDifficulty;
  topicSlug: string;
  pattern: string;
  platform: "LEETCODE" | "GEEKSFORGEEKS" | "CODEFORCES" | "OTHER";
  externalId: string;
  platformProblemUrl: string;
  solutionUrl?: string;
  estimatedMinutes: number;
  tags: string[];
  timeComplexityHint?: string;
  spaceComplexityHint?: string;
}

const lc = (
  title: string,
  difficulty: SeedDifficulty,
  topicSlug: string,
  pattern: string,
  slug: string,
  minutes: number,
  extras: Partial<SeedProblem> = {},
): SeedProblem => ({
  slug,
  title,
  difficulty,
  topicSlug,
  pattern,
  platform: "LEETCODE",
  externalId: slug,
  platformProblemUrl: `https://leetcode.com/problems/${slug}/`,
  estimatedMinutes: minutes,
  tags: [],
  ...extras,
});

// ── Problem catalog ──────────────────────────────────────────────────────────

export const problems: SeedProblem[] = [
  // DSA Foundations
  lc("Two Sum", "EASY", "arrays-hashing", "Hash Map", "two-sum", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Contains Duplicate", "EASY", "arrays-hashing", "Hash Set", "contains-duplicate", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Valid Anagram", "EASY", "arrays-hashing", "Hash Map", "valid-anagram", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1) — fixed alphabet",
  }),
  lc("Group Anagrams", "MEDIUM", "arrays-hashing", "Hash Map", "group-anagrams", 25, {
    timeComplexityHint: "O(n·k)", spaceComplexityHint: "O(n·k)",
  }),
  lc("Top K Frequent Elements", "MEDIUM", "arrays-hashing", "Heap / Bucket Sort", "top-k-frequent-elements", 25, {
    timeComplexityHint: "O(n log k)", spaceComplexityHint: "O(n)",
  }),
  lc("Product of Array Except Self", "MEDIUM", "arrays-hashing", "Prefix Products", "product-of-array-except-self", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1) extra",
  }),
  lc("Longest Consecutive Sequence", "MEDIUM", "arrays-hashing", "Hash Set", "longest-consecutive-sequence", 35, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Move Zeroes", "EASY", "arrays-hashing", "Two Pointers", "move-zeroes", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Majority Element", "EASY", "arrays-hashing", "Boyer–Moore Vote", "majority-element", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Find All Numbers Disappeared in an Array", "EASY", "arrays-hashing", "Index Marking", "find-all-numbers-disappeared-in-an-array", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Missing Number", "EASY", "arrays-hashing", "Math / XOR", "missing-number", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),

  // Two Pointers
  lc("Valid Palindrome", "EASY", "two-pointers", "Two Pointers", "valid-palindrome", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Two Sum II — Input Array Is Sorted", "MEDIUM", "two-pointers", "Two Pointers", "two-sum-ii-input-array-is-sorted", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("3Sum", "MEDIUM", "two-pointers", "Two Pointers + Sorting", "3sum", 35, {
    timeComplexityHint: "O(n²)", spaceComplexityHint: "O(1) extra",
  }),
  lc("Container With Most Water", "MEDIUM", "two-pointers", "Two Pointers", "container-with-most-water", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Trapping Rain Water", "HARD", "two-pointers", "Two Pointers", "trapping-rain-water", 40, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),

  // Sliding Window
  lc("Best Time to Buy and Sell Stock", "EASY", "sliding-window", "Sliding Window", "best-time-to-buy-and-sell-stock", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Longest Substring Without Repeating Characters", "MEDIUM", "sliding-window", "Sliding Window", "longest-substring-without-repeating-characters", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(min(n, alphabet))",
  }),
  lc("Longest Repeating Character Replacement", "MEDIUM", "sliding-window", "Sliding Window", "longest-repeating-character-replacement", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(26)",
  }),
  lc("Minimum Window Substring", "HARD", "sliding-window", "Sliding Window", "minimum-window-substring", 45, {
    timeComplexityHint: "O(n + m)", spaceComplexityHint: "O(1)",
  }),

  // Binary Search
  lc("Binary Search", "EASY", "binary-search", "Binary Search", "binary-search", 15, {
    timeComplexityHint: "O(log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Search Insert Position", "EASY", "binary-search", "Binary Search", "search-insert-position", 15, {
    timeComplexityHint: "O(log n)", spaceComplexityHint: "O(1)",
  }),
  lc("First Bad Version", "EASY", "binary-search", "Binary Search", "first-bad-version", 15, {
    timeComplexityHint: "O(log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Find Minimum in Rotated Sorted Array", "MEDIUM", "binary-search", "Binary Search", "find-minimum-in-rotated-sorted-array", 25, {
    timeComplexityHint: "O(log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Search in Rotated Sorted Array", "MEDIUM", "binary-search", "Binary Search", "search-in-rotated-sorted-array", 35, {
    timeComplexityHint: "O(log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Koko Eating Bananas", "MEDIUM", "binary-search", "Binary Search on Answer", "koko-eating-bananas", 30, {
    timeComplexityHint: "O(n log max(piles))", spaceComplexityHint: "O(1)",
  }),
  lc("Search a 2D Matrix", "MEDIUM", "binary-search", "Binary Search", "search-a-2d-matrix", 25, {
    timeComplexityHint: "O(log(m·n))", spaceComplexityHint: "O(1)",
  }),

  // Sorting
  lc("Merge Sorted Array", "EASY", "sorting", "Two Pointers (in-place)", "merge-sorted-array", 20, {
    timeComplexityHint: "O(m + n)", spaceComplexityHint: "O(1)",
  }),
  lc("Sort Colors", "MEDIUM", "sorting", "Dutch National Flag", "sort-colors", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Kth Largest Element in an Array", "MEDIUM", "sorting", "Quickselect / Heap", "kth-largest-element-in-an-array", 30, {
    timeComplexityHint: "O(n) avg", spaceComplexityHint: "O(1)",
  }),

  // Linked Lists
  lc("Reverse Linked List", "EASY", "linked-lists", "Pointer Manipulation", "reverse-linked-list", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Middle of the Linked List", "EASY", "linked-lists", "Fast & Slow Pointers", "middle-of-the-linked-list", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Merge Two Sorted Lists", "EASY", "linked-lists", "Two Pointers / Recursion", "merge-two-sorted-lists", 20, {
    timeComplexityHint: "O(m + n)", spaceComplexityHint: "O(1)",
  }),
  lc("Linked List Cycle", "EASY", "linked-lists", "Fast & Slow Pointers", "linked-list-cycle", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Remove Nth Node From End of List", "MEDIUM", "linked-lists", "Two Pointers", "remove-nth-node-from-end-of-list", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Reorder List", "MEDIUM", "linked-lists", "Split + Reverse + Merge", "reorder-list", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Merge K Sorted Lists", "HARD", "linked-lists", "Heap / Divide & Conquer", "merge-k-sorted-lists", 35, {
    timeComplexityHint: "O(n log k)", spaceComplexityHint: "O(k)",
  }),

  // Stacks & Queues
  lc("Valid Parentheses", "EASY", "stacks-queues", "Stack", "valid-parentheses", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Min Stack", "MEDIUM", "stacks-queues", "Stack", "min-stack", 25, {
    timeComplexityHint: "O(1) per op", spaceComplexityHint: "O(n)",
  }),
  lc("Implement Queue using Stacks", "EASY", "stacks-queues", "Stack", "implement-queue-using-stacks", 20, {
    timeComplexityHint: "O(1) amortized", spaceComplexityHint: "O(n)",
  }),
  lc("Daily Temperatures", "MEDIUM", "stacks-queues", "Monotonic Stack", "daily-temperatures", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Evaluate Reverse Polish Notation", "MEDIUM", "stacks-queues", "Stack", "evaluate-reverse-polish-notation", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Generate Parentheses", "MEDIUM", "stacks-queues", "Backtracking", "generate-parentheses", 30, {
    timeComplexityHint: "O(4ⁿ/√n)", spaceComplexityHint: "O(n)",
  }),
  lc("Car Fleet", "MEDIUM", "stacks-queues", "Sort + Stack", "car-fleet", 35, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(n)",
  }),

  // Trees
  lc("Maximum Depth of Binary Tree", "EASY", "trees", "DFS / Recursion", "maximum-depth-of-binary-tree", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Invert Binary Tree", "EASY", "trees", "DFS / Recursion", "invert-binary-tree", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Same Tree", "EASY", "trees", "DFS / Recursion", "same-tree", 15, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Diameter of Binary Tree", "EASY", "trees", "DFS / Recursion", "diameter-of-binary-tree", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Balanced Binary Tree", "EASY", "trees", "DFS / Recursion", "balanced-binary-tree", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Subtree of Another Tree", "EASY", "trees", "DFS / Recursion", "subtree-of-another-tree", 25, {
    timeComplexityHint: "O(n·m)", spaceComplexityHint: "O(h)",
  }),
  lc("Binary Tree Level Order Traversal", "MEDIUM", "trees", "BFS", "binary-tree-level-order-traversal", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Binary Tree Right Side View", "MEDIUM", "trees", "BFS / DFS", "binary-tree-right-side-view", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Validate Binary Search Tree", "MEDIUM", "trees", "Inorder Traversal / Range", "validate-binary-search-tree", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),
  lc("Kth Smallest Element in a BST", "MEDIUM", "trees", "Inorder Traversal", "kth-smallest-element-in-a-bst", 30, {
    timeComplexityHint: "O(h + k)", spaceComplexityHint: "O(h)",
  }),
  lc("Lowest Common Ancestor of a Binary Search Tree", "MEDIUM", "trees", "BST Property", "lowest-common-ancestor-of-a-binary-search-tree", 20, {
    timeComplexityHint: "O(h)", spaceComplexityHint: "O(1)",
  }),
  lc("Construct Binary Tree from Preorder and Inorder Traversal", "MEDIUM", "trees", "Recursion + Map", "construct-binary-tree-from-preorder-and-inorder-traversal", 35, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Binary Tree Maximum Path Sum", "HARD", "trees", "DFS / Recursion", "binary-tree-maximum-path-sum", 40, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(h)",
  }),

  // Tries
  lc("Implement Trie (Prefix Tree)", "MEDIUM", "tries", "Trie", "implement-trie-prefix-tree", 30, {
    timeComplexityHint: "O(L) per op", spaceComplexityHint: "O(total letters)",
  }),
  lc("Design Add and Search Words Data Structure", "MEDIUM", "tries", "Trie + DFS", "add-and-search-word-data-structure-design", 35, {
    timeComplexityHint: "O(L) search (O(26^L) with wildcards)", spaceComplexityHint: "O(total letters)",
  }),
  lc("Word Search II", "HARD", "tries", "Trie + Backtracking", "word-search-ii", 45, {
    timeComplexityHint: "O(m·n·4^L)", spaceComplexityHint: "O(total letters)",
  }),

  // Heaps
  lc("Kth Largest Element in a Stream", "EASY", "heaps", "Min Heap", "kth-largest-element-in-a-stream", 25, {
    timeComplexityHint: "O(log k) per add", spaceComplexityHint: "O(k)",
  }),
  lc("Last Stone Weight", "EASY", "heaps", "Max Heap", "last-stone-weight", 20, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(n)",
  }),
  lc("K Closest Points to Origin", "MEDIUM", "heaps", "Heap / Quickselect", "k-closest-points-to-origin", 25, {
    timeComplexityHint: "O(n log k)", spaceComplexityHint: "O(k)",
  }),
  lc("Task Scheduler", "MEDIUM", "heaps", "Heap / Greedy", "task-scheduler", 35, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Design Twitter", "MEDIUM", "heaps", "Heap / Design", "design-twitter", 40, {
    timeComplexityHint: "O(k) per feed", spaceComplexityHint: "O(total tweets)",
  }),
  lc("Find Median from Data Stream", "HARD", "heaps", "Two Heaps", "find-median-from-data-stream", 40, {
    timeComplexityHint: "O(log n) per add", spaceComplexityHint: "O(n)",
  }),

  // Backtracking
  lc("Subsets", "MEDIUM", "backtracking", "Backtracking", "subsets", 25, {
    timeComplexityHint: "O(2ⁿ)", spaceComplexityHint: "O(2ⁿ)",
  }),
  lc("Combination Sum", "MEDIUM", "backtracking", "Backtracking", "combination-sum", 30, {
    timeComplexityHint: "O(2^(t/m))", spaceComplexityHint: "O(t/m)",
  }),
  lc("Permutations", "MEDIUM", "backtracking", "Backtracking", "permutations", 30, {
    timeComplexityHint: "O(n!)", spaceComplexityHint: "O(n!)",
  }),
  lc("Subsets II", "MEDIUM", "backtracking", "Backtracking + Sort", "subsets-ii", 30, {
    timeComplexityHint: "O(2ⁿ)", spaceComplexityHint: "O(2ⁿ)",
  }),
  lc("Combination Sum II", "MEDIUM", "backtracking", "Backtracking + Sort", "combination-sum-ii", 30, {
    timeComplexityHint: "O(2ⁿ)", spaceComplexityHint: "O(2ⁿ)",
  }),
  lc("Word Search", "MEDIUM", "backtracking", "Backtracking / DFS", "word-search", 35, {
    timeComplexityHint: "O(m·n·4^L)", spaceComplexityHint: "O(L)",
  }),

  // Graphs
  lc("Number of Islands", "MEDIUM", "graphs", "BFS / DFS / Union-Find", "number-of-islands", 30, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(m·n)",
  }),
  lc("Clone Graph", "MEDIUM", "graphs", "BFS/DFS + Map", "clone-graph", 30, {
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V)",
  }),
  lc("Pacific Atlantic Water Flow", "MEDIUM", "graphs", "Reverse DFS/BFS", "pacific-atlantic-water-flow", 40, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(m·n)",
  }),
  lc("Course Schedule", "MEDIUM", "graphs", "Topological Sort / Cycle Detection", "course-schedule", 35, {
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V + E)",
  }),
  lc("Course Schedule II", "MEDIUM", "graphs", "Topological Sort", "course-schedule-ii", 35, {
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V + E)",
  }),
  lc("Rotting Oranges", "MEDIUM", "graphs", "BFS (multi-source)", "rotting-oranges", 30, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(m·n)",
  }),
  lc("Flood Fill", "EASY", "graphs", "DFS / BFS", "flood-fill", 20, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(m·n)",
  }),

  // Dynamic Programming
  lc("Climbing Stairs", "EASY", "dynamic-programming", "DP", "climbing-stairs", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("House Robber", "MEDIUM", "dynamic-programming", "DP", "house-robber", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("House Robber II", "MEDIUM", "dynamic-programming", "DP (two passes)", "house-robber-ii", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Longest Palindromic Substring", "MEDIUM", "dynamic-programming", "Expand Around Center / DP", "longest-palindromic-substring", 30, {
    timeComplexityHint: "O(n²)", spaceComplexityHint: "O(1)",
  }),
  lc("Palindromic Substrings", "MEDIUM", "dynamic-programming", "Expand Around Center / DP", "palindromic-substrings", 30, {
    timeComplexityHint: "O(n²)", spaceComplexityHint: "O(1)",
  }),
  lc("Decode Ways", "MEDIUM", "dynamic-programming", "DP", "decode-ways", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Coin Change", "MEDIUM", "dynamic-programming", "DP (unbounded knapsack)", "coin-change", 30, {
    timeComplexityHint: "O(amount·n)", spaceComplexityHint: "O(amount)",
  }),
  lc("Maximum Product Subarray", "MEDIUM", "dynamic-programming", "DP (track min & max)", "maximum-product-subarray", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),
  lc("Word Break", "MEDIUM", "dynamic-programming", "DP", "word-break", 30, {
    timeComplexityHint: "O(n²)", spaceComplexityHint: "O(n)",
  }),
  lc("Longest Increasing Subsequence", "MEDIUM", "dynamic-programming", "DP / Patience Sort", "longest-increasing-subsequence", 35, {
    timeComplexityHint: "O(n²) or O(n log n)", spaceComplexityHint: "O(n)",
  }),
  lc("Longest Common Subsequence", "MEDIUM", "dynamic-programming", "2D DP", "longest-common-subsequence", 30, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(m·n)",
  }),
  lc("Unique Paths", "MEDIUM", "dynamic-programming", "2D DP / Combinatorics", "unique-paths", 25, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(n)",
  }),
  lc("Jump Game", "MEDIUM", "dynamic-programming", "Greedy", "jump-game", 25, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(1)",
  }),

  // Intervals
  lc("Insert Interval", "MEDIUM", "intervals", "Interval Sweep", "insert-interval", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Merge Intervals", "MEDIUM", "intervals", "Sort + Sweep", "merge-intervals", 25, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(n)",
  }),
  lc("Non-overlapping Intervals", "MEDIUM", "intervals", "Greedy (end sorting)", "non-overlapping-intervals", 30, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Meeting Rooms", "EASY", "intervals", "Sort + Sweep", "meeting-rooms", 20, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(1)",
  }),
  lc("Meeting Rooms II", "MEDIUM", "intervals", "Heap / Sweep Line", "meeting-rooms-ii", 35, {
    timeComplexityHint: "O(n log n)", spaceComplexityHint: "O(n)",
  }),

  // Matrix
  lc("Set Matrix Zeroes", "MEDIUM", "matrix", "In-place marking", "set-matrix-zeroes", 30, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(1)",
  }),
  lc("Spiral Matrix", "MEDIUM", "matrix", "Boundary Simulation", "spiral-matrix", 30, {
    timeComplexityHint: "O(m·n)", spaceComplexityHint: "O(1)",
  }),
  lc("Rotate Image", "MEDIUM", "matrix", "Transpose + Reverse", "rotate-image", 25, {
    timeComplexityHint: "O(n²)", spaceComplexityHint: "O(1)",
  }),

  // Bit Manipulation
  lc("Number of 1 Bits", "EASY", "bit-manipulation", "Bit Tricks", "number-of-1-bits", 15, {
    timeComplexityHint: "O(1) (32 bits)", spaceComplexityHint: "O(1)",
  }),
  lc("Counting Bits", "EASY", "bit-manipulation", "DP + Bit Tricks", "counting-bits", 20, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),
  lc("Reverse Bits", "EASY", "bit-manipulation", "Bit Manipulation", "reverse-bits", 20, {
    timeComplexityHint: "O(1)", spaceComplexityHint: "O(1)",
  }),
  lc("Sum of Two Integers", "MEDIUM", "bit-manipulation", "Bit Manipulation (no +)", "sum-of-two-integers", 25, {
    timeComplexityHint: "O(1)", spaceComplexityHint: "O(1)",
  }),

  // Strings
  lc("Encode and Decode Strings", "MEDIUM", "strings", "Length Prefixing", "encode-and-decode-strings", 30, {
    timeComplexityHint: "O(n)", spaceComplexityHint: "O(n)",
  }),

  // Premium problems — official links exist, full access requires a LeetCode subscription.
  lc("Alien Dictionary", "HARD", "graphs", "Topological Sort", "alien-dictionary", 45, {
    tags: ["premium"],
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V + E)",
  }),
  lc("Graph Valid Tree", "MEDIUM", "graphs", "Union-Find / DFS", "graph-valid-tree", 30, {
    tags: ["premium"],
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V)",
  }),
  lc("Number of Connected Components in an Undirected Graph", "MEDIUM", "graphs", "Union-Find / DFS", "number-of-connected-components-in-an-undirected-graph", 30, {
    tags: ["premium"],
    timeComplexityHint: "O(V + E)", spaceComplexityHint: "O(V)",
  }),
];

// ── Sheets ───────────────────────────────────────────────────────────────────

export interface SeedSheetTopic {
  topicSlug: string;
  /** Problem slugs in learning order. */
  problemSlugs: string[];
}

export interface SeedSheet {
  slug: string;
  name: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  estimatedHours: number;
  sourceAttribution?: string;
  topics: SeedSheetTopic[];
}

/** DSARats Foundation — an original, ordered curriculum. */
export const foundationSheet: SeedSheet = {
  slug: "dsarats-foundation",
  name: "DSARats Foundation",
  description:
    "An original, ordered path from the very basics to interview-level problem solving. Follow the topics in order — each stage builds on the last.",
  difficulty: "BEGINNER",
  estimatedHours: 60,
  topics: [
    {
      topicSlug: "dsa-foundations",
      problemSlugs: [
        "two-sum",
        "contains-duplicate",
        "valid-anagram",
        "move-zeroes",
        "missing-number",
      ],
    },
    {
      topicSlug: "arrays-hashing",
      problemSlugs: [
        "majority-element",
        "find-all-numbers-disappeared-in-an-array",
        "group-anagrams",
        "product-of-array-except-self",
        "top-k-frequent-elements",
        "longest-consecutive-sequence",
      ],
    },
    {
      topicSlug: "two-pointers",
      problemSlugs: ["valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water"],
    },
    {
      topicSlug: "sliding-window",
      problemSlugs: [
        "best-time-to-buy-and-sell-stock",
        "longest-substring-without-repeating-characters",
        "longest-repeating-character-replacement",
      ],
    },
    {
      topicSlug: "binary-search",
      problemSlugs: ["binary-search", "search-insert-position", "first-bad-version", "koko-eating-bananas"],
    },
    {
      topicSlug: "sorting",
      problemSlugs: ["merge-sorted-array", "sort-colors", "kth-largest-element-in-an-array"],
    },
    {
      topicSlug: "linked-lists",
      problemSlugs: [
        "reverse-linked-list",
        "middle-of-the-linked-list",
        "merge-two-sorted-lists",
        "linked-list-cycle",
        "remove-nth-node-from-end-of-list",
        "reorder-list",
      ],
    },
    {
      topicSlug: "stacks-queues",
      problemSlugs: [
        "valid-parentheses",
        "implement-queue-using-stacks",
        "min-stack",
        "daily-temperatures",
        "evaluate-reverse-polish-notation",
      ],
    },
    {
      topicSlug: "trees",
      problemSlugs: [
        "maximum-depth-of-binary-tree",
        "invert-binary-tree",
        "same-tree",
        "diameter-of-binary-tree",
        "binary-tree-level-order-traversal",
        "validate-binary-search-tree",
        "kth-smallest-element-in-a-bst",
        "lowest-common-ancestor-of-a-binary-search-tree",
      ],
    },
    {
      topicSlug: "graphs",
      problemSlugs: [
        "flood-fill",
        "number-of-islands",
        "clone-graph",
        "rotting-oranges",
        "course-schedule",
      ],
    },
    {
      topicSlug: "dynamic-programming",
      problemSlugs: [
        "climbing-stairs",
        "house-robber",
        "coin-change",
        "longest-common-subsequence",
        "longest-increasing-subsequence",
        "word-break",
        "unique-paths",
      ],
    },
  ],
};

/** Blind 75 — the widely used community interview list. Metadata + official links only. */
export const blind75Sheet: SeedSheet = {
  slug: "blind-75",
  name: "Blind 75",
  description:
    "The classic community interview list — 75 hand-picked problems covering the patterns most asked in coding interviews. Tracked problem by problem.",
  difficulty: "INTERMEDIATE",
  estimatedHours: 90,
  sourceAttribution: "Blind 75 is a widely shared community list (see leetcode.com/problem-list/blind75).",
  topics: [
    {
      topicSlug: "arrays-hashing",
      problemSlugs: [
        "contains-duplicate",
        "valid-anagram",
        "two-sum",
        "group-anagrams",
        "top-k-frequent-elements",
        "product-of-array-except-self",
        "encode-and-decode-strings",
        "longest-consecutive-sequence",
      ],
    },
    {
      topicSlug: "two-pointers",
      problemSlugs: ["valid-palindrome", "two-sum-ii-input-array-is-sorted", "3sum", "container-with-most-water"],
    },
    {
      topicSlug: "sliding-window",
      problemSlugs: [
        "best-time-to-buy-and-sell-stock",
        "longest-substring-without-repeating-characters",
        "longest-repeating-character-replacement",
        "minimum-window-substring",
      ],
    },
    {
      topicSlug: "stacks-queues",
      problemSlugs: ["valid-parentheses", "min-stack", "evaluate-reverse-polish-notation", "generate-parentheses", "daily-temperatures"],
    },
    {
      topicSlug: "binary-search",
      problemSlugs: ["binary-search", "search-a-2d-matrix", "koko-eating-bananas", "find-minimum-in-rotated-sorted-array", "search-in-rotated-sorted-array"],
    },
    {
      topicSlug: "linked-lists",
      problemSlugs: [
        "reverse-linked-list",
        "merge-two-sorted-lists",
        "reorder-list",
        "remove-nth-node-from-end-of-list",
        "linked-list-cycle",
        "merge-k-sorted-lists",
      ],
    },
    {
      topicSlug: "trees",
      problemSlugs: [
        "invert-binary-tree",
        "maximum-depth-of-binary-tree",
        "diameter-of-binary-tree",
        "balanced-binary-tree",
        "same-tree",
        "subtree-of-another-tree",
        "lowest-common-ancestor-of-a-binary-search-tree",
        "binary-tree-level-order-traversal",
        "binary-tree-right-side-view",
        "validate-binary-search-tree",
        "kth-smallest-element-in-a-bst",
        "construct-binary-tree-from-preorder-and-inorder-traversal",
      ],
    },
    {
      topicSlug: "tries",
      problemSlugs: ["implement-trie-prefix-tree", "add-and-search-word-data-structure-design", "word-search-ii"],
    },
    {
      topicSlug: "heaps",
      problemSlugs: [
        "find-median-from-data-stream",
        "kth-largest-element-in-a-stream",
        "last-stone-weight",
        "k-closest-points-to-origin",
        "task-scheduler",
        "design-twitter",
      ],
    },
    {
      topicSlug: "backtracking",
      problemSlugs: ["subsets", "combination-sum", "permutations", "subsets-ii", "combination-sum-ii", "word-search"],
    },
    {
      topicSlug: "graphs",
      problemSlugs: [
        "number-of-islands",
        "clone-graph",
        "pacific-atlantic-water-flow",
        "course-schedule",
        "course-schedule-ii",
        "alien-dictionary",
        "graph-valid-tree",
        "number-of-connected-components-in-an-undirected-graph",
      ],
    },
    {
      topicSlug: "intervals",
      problemSlugs: ["insert-interval", "merge-intervals", "non-overlapping-intervals", "meeting-rooms", "meeting-rooms-ii"],
    },
    {
      topicSlug: "dynamic-programming",
      problemSlugs: [
        "climbing-stairs",
        "house-robber",
        "house-robber-ii",
        "longest-palindromic-substring",
        "palindromic-substrings",
        "decode-ways",
        "coin-change",
        "maximum-product-subarray",
        "word-break",
        "longest-increasing-subsequence",
        "longest-common-subsequence",
        "unique-paths",
        "jump-game",
      ],
    },
  ],
};

export const sheets: SeedSheet[] = [foundationSheet, blind75Sheet];