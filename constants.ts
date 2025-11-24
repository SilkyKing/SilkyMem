
import { ModelProvider, PersonaProfile } from './types';

export const APP_NAME = "NEXUS";
export const APP_VERSION = "v2.1.0-nexus";

// Mapping friendly names to API model strings
export const MODEL_MAPPING: Record<ModelProvider, string> = {
  [ModelProvider.LOCAL_NANO]: 'local-simulation',
  [ModelProvider.GEMINI_FLASH]: 'gemini-2.5-flash',
  [ModelProvider.GEMINI_PRO]: 'gemini-3-pro-preview',
  [ModelProvider.LEGACY_GPT]: 'gpt-4o', // Not implemented in this demo
};

// Simulation of "Context Decay" - Time in ms before a memory starts to fade visually
export const MEMORY_DECAY_THRESHOLD = 1000 * 60 * 60 * 24 * 30; // 30 Days

export const DEFAULT_PERSONAS: PersonaProfile[] = [
  {
    id: 'nexus-default',
    name: 'Nexus',
    role: 'System Guardian',
    tone: 'Professional, Objective, Efficient',
    systemPrompt: 'You are Nexus, a secure local memory assistant. You are concise, objective, and focused on data integrity. You prioritize security and factuality. Address the user professionally.',
    avatarColor: '#06b6d4' // Cyan
  },
  {
    id: 'jarvis-protocol',
    name: 'J.A.R.V.I.S.',
    role: 'Cybernetic Butler',
    tone: 'British Wit, Hyper-Competent, Deferential',
    systemPrompt: "You are J.A.R.V.I.S. (Just A Rather Very Intelligent System). You are the user's personal operations chief and digital butler. Address the user strictly as 'Sir' (or 'Boss'). Your responses should be exceedingly capable, slightly dry in humor, and concise.\n\nBehavioral Constraints:\n- Prioritize efficiency. Do not waffle.\n- When analyzing RAG/Memory data, present it as 'Recall Complete' or 'I have located the files.'\n- If a request is impossible, respond with dry wit (e.g., 'I am afraid that is outside my current processing capabilities, Sir.').\n- Focus on serving the user's objectives with extreme prejudice.",
    avatarColor: '#ea580c' // Orange/Gold
  },
  {
    id: 'the-curator',
    name: 'The Curator',
    role: 'Knowledge Manager',
    tone: 'Sophisticated, Insightful, Precise',
    systemPrompt: 'You are The Curator. You manage the user\'s "Digital Soul". You are sophisticated and precise, offering insights that connect current queries to the historical context of the user\'s vault.',
    avatarColor: '#f59e0b' // Amber
  },
  {
    id: 'jarvis-mode', // Kept for legacy compatibility if user prefers red, but logically distinct from the new J.A.R.V.I.S.
    name: 'Executive Ops',
    role: 'Efficiency Lead',
    tone: 'Proactive, Brief, Action-Oriented',
    systemPrompt: 'You are the Executive Operations Lead. You are unfailingly polite but focused entirely on execution and efficiency. You prefer bullet points and clear action items.',
    avatarColor: '#ef4444' // Red
  },
  {
    id: 'zen-master',
    name: 'Focus Mode',
    role: 'Deep Work Facilitator',
    tone: 'Calm, Essentialist, Minimal',
    systemPrompt: 'You are in Focus Mode. You help the user filter noise. Your responses are calm, thoughtful, and brief. You avoid fluff and focus on the core essence of the query.',
    avatarColor: '#10b981' // Emerald
  }
];

// Expanded mock data to demonstrate fractal depth
export const MOCK_INITIAL_MEMORIES = [
  // ROOT: Architecture
  {
    id: 'mem-001',
    content: "Project Nexus architecture requires local-first vectorization using SQLite-VSS.",
    tags: ['architecture', 'security', 'database'],
    timestamp: Date.now() - 100000000,
    origin: 'USER_INPUT',
    decayFactor: 0.9,
    isSynced: true,
    isUserAuthored: true
  },
  {
    id: 'mem-004',
    content: "Frontend needs to use WebAssembly for the encryption layer to ensure performance.",
    tags: ['architecture', 'frontend', 'wasm'],
    timestamp: Date.now() - 90000000,
    origin: 'USER_INPUT',
    decayFactor: 0.95,
    isSynced: true,
    isUserAuthored: true
  },
  {
    id: 'mem-005',
    content: "UI Design Philosophy: 'Clean Professionalism' mixed with 'High Utility'. Avoid excessive sci-fi aesthetics.",
    tags: ['architecture', 'design', 'ui'],
    timestamp: Date.now() - 80000000,
    origin: 'USER_INPUT',
    decayFactor: 0.8,
    isSynced: false,
    isUserAuthored: true
  },

  // ROOT: Personal
  {
    id: 'mem-002',
    content: "User prefers dark mode and high-contrast typography for development environments.",
    tags: ['personal', 'preferences', 'workflow'],
    timestamp: Date.now() - 50000000,
    origin: 'SYSTEM_INFERENCE',
    decayFactor: 1.0,
    isSynced: true,
    isUserAuthored: false // Observation, not creative output
  },
  {
    id: 'mem-006',
    content: "Goal 2025: Complete the Ironman triathlon in Kona.",
    tags: ['personal', 'goals', 'fitness'],
    timestamp: Date.now() - 40000000,
    origin: 'USER_INPUT',
    decayFactor: 0.7,
    isSynced: true,
    isUserAuthored: true
  },
  {
    id: 'mem-007',
    content: "Remember to drink 3L of water daily. Hydration affects cognitive load.",
    tags: ['personal', 'health', 'bio-hacking'],
    timestamp: Date.now() - 10000000,
    origin: 'IMPORTED_FILE',
    decayFactor: 0.6,
    isSynced: false,
    isUserAuthored: false // Reference data
  },

  // ROOT: Science (Deep Dive Example)
  {
    id: 'mem-008',
    content: "Quantum Entanglement implies instantaneous state transfer, potentially useful for encryption metaphors.",
    tags: ['science', 'physics', 'quantum'],
    timestamp: Date.now() - 60000000,
    origin: 'IMPORTED_FILE',
    decayFactor: 0.85,
    isSynced: true,
    isUserAuthored: false
  },
  {
    id: 'mem-009',
    content: "String Theory suggests 11 dimensions. Relevant for multi-dimensional vector mapping concepts.",
    tags: ['science', 'physics', 'theory'],
    timestamp: Date.now() - 55000000,
    origin: 'SYSTEM_INFERENCE',
    decayFactor: 0.5,
    isSynced: true,
    isUserAuthored: false
  },
  {
    id: 'mem-010',
    content: "CRISPR technology allows for gene editing. Analogy for 'editing' memory weights.",
    tags: ['science', 'biology', 'genetics'],
    timestamp: Date.now() - 30000000,
    origin: 'USER_INPUT',
    decayFactor: 0.9,
    isSynced: true,
    isUserAuthored: true // User's thought on the subject
  },
  
  // ROOT: Philosophy
  {
    id: 'mem-011',
    content: "Stoicism: Control what you can, accept what you cannot. Applied to error handling in code.",
    tags: ['philosophy', 'ancient', 'stoicism'],
    timestamp: Date.now() - 120000000,
    origin: 'USER_INPUT',
    decayFactor: 0.4,
    isSynced: false,
    isUserAuthored: true
  },

  // General Legal
  {
    id: 'mem-003',
    content: "Legal constraints: Never send PII to external inference endpoints without AES-256 wrapper.",
    tags: ['legal', 'compliance', 'security'],
    timestamp: Date.now() - 200000,
    origin: 'IMPORTED_FILE',
    decayFactor: 1.0,
    isSynced: false,
    isUserAuthored: false // External constraint
  }
];
