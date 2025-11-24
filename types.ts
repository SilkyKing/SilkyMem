
// The "Digital DNA" Format
// This schema is designed to be readable in 2075.

export enum Emotion {
  NEUTRAL = 'NEUTRAL',
  JOY = 'JOY',
  FOCUS = 'FOCUS',
  ANXIETY = 'ANXIETY',
  URGENCY = 'URGENCY'
}

export enum OriginSource {
  USER_INPUT = 'USER_INPUT',
  SYSTEM_INFERENCE = 'SYSTEM_INFERENCE',
  IMPORTED_FILE = 'IMPORTED_FILE',
  EMAIL_IMPORT = 'EMAIL_IMPORT'
}

export enum StorageMode {
  AUTO_SYNC_ALL = 'AUTO_SYNC_ALL',
  SELECTIVE_MANUAL = 'SELECTIVE_MANUAL'
}

export interface MemoryNode {
  id: string; // UUID
  timestamp: number; // Unix Epoch
  lastAccessed: number; // For decay algorithms
  vectorId: string; // Reference to the vector embedding
  content: string; // The raw semantic payload
  semanticHash: string; // SHA-256 of content for integrity
  emotion: Emotion;
  origin: OriginSource;
  tags: string[];
  decayFactor: number; // 0.0 to 1.0 (1.0 = fully lucid, 0.1 = compressed/faded)
  isSynced: boolean; // Whether the node is backed up to the encrypted cloud
  isUserAuthored: boolean; // TRUE = User's Creative Output (My Style), FALSE = Reference Material (Input)
}

export enum ModelProvider {
  LOCAL_NANO = 'Gemini Nano (Local)',
  GEMINI_FLASH = 'Gemini 2.5 Flash',
  GEMINI_PRO = 'Gemini 3.0 Pro',
  LEGACY_GPT = 'GPT-4o (Legacy Bridge)',
}

export type ApiProviderType = 'GOOGLE' | 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'MISTRAL' | 'XAI' | 'CUSTOM_LOCAL';

export interface ApiConfig {
  id: string;
  provider: ApiProviderType;
  name: string; // Friendly name e.g. "My Personal Gemini"
  apiKey?: string;
  baseUrl?: string; // For local/custom e.g. "http://localhost:11434/v1"
  modelId?: string; // Specific model ID override
  isActive: boolean;
}

export interface UsageMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEstimate: number; // In USD cents
  provider: ApiProviderType;
  model: string;
  routingMode: 'LIGHTNING' | 'DEEP_THOUGHT' | 'STANDARD';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  relatedMemories?: string[]; // IDs of MemoryNodes injected into RAG
  isEncrypted: boolean; // Visual indicator of Zero-Knowledge state
  metrics?: UsageMetrics; // Token usage for this turn
}

export interface EncryptionPacket {
  iv: string;
  ciphertext: string;
  hash: string;
}

export interface SystemStatus {
  vaultSize: number;
  encryptionStatus: 'SECURE' | 'VULNERABLE';
  connectionState: 'ONLINE' | 'OFFLINE';
  activeModel: ModelProvider;
  storageMode: StorageMode;
  activeApiId?: string;
}

export interface PersonaProfile {
  id: string;
  name: string;
  role: string; // e.g., "The Archivist", "Protocol Droid"
  tone: string; // e.g., "Formal", "Witty", "Sarcastic"
  systemPrompt: string; // The core directive
  avatarColor: string; // Hex for UI accent
  isCustom?: boolean; // Distinguishes user-created agents from system defaults
}

// --- NEW AUTH TYPES ---

export enum AuthStage {
  CHECKING_STATUS = 'CHECKING_STATUS', // Initial Load
  VAULT_SETUP = 'VAULT_SETUP',       // Step 2a: Create PIN (First Run)
  VAULT_UNLOCK = 'VAULT_UNLOCK',     // Step 2b: Enter PIN (Recurring)
  RECOVERY_FLOW = 'RECOVERY_FLOW',   // Forgot PIN
  AUTHENTICATED = 'AUTHENTICATED'    // Access Granted
}

export interface UserIdentity {
  email: string;
  subscriptionTier: 'FREE' | 'PRO' | 'LIFETIME';
  isCloudAuthenticated: boolean;
}

// --- PROMPT ENGINEERING TYPES ---

export type PromptInjectionStrategy = 'PREPEND' | 'APPEND' | 'INTERLEAVE';

export interface GenerationOptions {
    temperature: number;
    injectionStrategy: PromptInjectionStrategy;
}