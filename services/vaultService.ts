import { MemoryNode, Emotion, OriginSource, StorageMode, PersonaProfile, ApiConfig, ApiProviderType } from '../types';
import { MOCK_INITIAL_MEMORIES, DEFAULT_PERSONAS } from '../constants';

// --- RAG UTILITIES ---

// 1. Recursive Character Text Splitter (Simplified)
const chunkText = (text: string, chunkSize: number = 500, overlap: number = 50): string[] => {
    if (text.length <= chunkSize) return [text];
    
    const chunks: string[] = [];
    let start = 0;
    
    while (start < text.length) {
        let end = start + chunkSize;
        
        // Try to break at a sentence or paragraph
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewLine = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewLine);
            
            if (breakPoint > start) {
                end = breakPoint + 1;
            }
        }
        
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
    }
    
    return chunks;
};

// 2. Deterministic Pseudo-Embedding
const generateEmbedding = async (text: string): Promise<number[]> => {
    const dimensions = 128; 
    const vector = new Array(dimensions).fill(0);
    
    const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = normalized.split(/\s+/);
    
    words.forEach(word => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i);
            hash |= 0;
        }
        const index = Math.abs(hash) % dimensions;
        vector[index] += 1.0;
    });
    
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => magnitude === 0 ? 0 : val / magnitude);
};

// 3. Cosine Similarity Calculation
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    return dotProduct; 
};

// --- MEMORY CONTROLLER (VaultKernel) ---

class VaultKernel {
  private memories: MemoryNode[] = [];
  private vectorIndex: Map<string, number[]> = new Map(); 
  
  private storageMode: StorageMode = StorageMode.SELECTIVE_MANUAL;
  private activePersona: PersonaProfile = DEFAULT_PERSONAS[0];
  private apiConfigs: ApiConfig[] = [];
  private activeApiId: string | null = null;
  
  // Security State
  private isDuressMode: boolean = false;
  private encryptionKey: string | null = null; // Simulating the Master Key
  private isLocked: boolean = true;
  private isCloudSyncActive: boolean = false;

  constructor() {
    // Lazy init via unlock
  }

  // --- SECURITY LAYER ---

  public async unlockVault(pin: string): Promise<'SUCCESS' | 'DURESS' | 'INVALID'> {
      // Simulate cryptographic unlock delay
      await new Promise(resolve => setTimeout(resolve, 800));

      if (pin === '1234') {
          this.isDuressMode = false;
          this.isLocked = false;
          this.encryptionKey = "mk_live_83928492"; // Mock Key
          await this.loadData(false);
          this.startCloudSyncSimulation();
          return 'SUCCESS';
      } else if (pin === '0000') {
          console.warn("SECURITY ALERT: DURESS PIN ENTERED. LOADING DECOY VAULT.");
          this.isDuressMode = true;
          this.isLocked = false;
          this.encryptionKey = "mk_decoy_00000000";
          await this.loadData(true); // Load Decoy
          return 'DURESS';
      } else {
          return 'INVALID';
      }
  }

  public lockVault() {
      this.isLocked = true;
      this.encryptionKey = null;
      this.memories = [];
      this.vectorIndex.clear();
  }

  private startCloudSyncSimulation() {
      if (this.isDuressMode) return; // Never sync decoy
      
      this.isCloudSyncActive = true;
      // In a real app, this would set up listeners for DB changes
  }

  // --- OMEGA PROTOCOL (Wipe) ---

  public async executeOmegaProtocol(): Promise<void> {
      console.error("PROTOCOL OMEGA INITIATED. CRYPTOGRAPHIC SHREDDING IN PROGRESS.");
      
      // Pass 1: Overwrite Data
      this.memories.forEach(m => {
          m.content = "00000000000000000000";
          m.vectorId = "0000";
      });
      
      // Pass 2: Overwrite Vector Index
      for (const key of this.vectorIndex.keys()) {
          this.vectorIndex.set(key, new Array(128).fill(0));
      }

      // Pass 3: Destroy References
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate shred time
      this.memories = [];
      this.vectorIndex.clear();
      this.apiConfigs = [];
      this.encryptionKey = null; // Destroy Master Key
      this.isLocked = true;
      
      // In real implementation:
      // await api.deleteRemoteBucket();
      // await fs.deleteLocalDatabase();
      
      window.location.reload(); // Force app restart to brick state
  }

  // --- THE SCALPEL (Granular Delete) ---

  public purgeMemory(id: string): void {
      const index = this.memories.findIndex(m => m.id === id);
      if (index !== -1) {
          // 1. Remove from Storage
          this.memories.splice(index, 1);
          // 2. Remove from Vector Store (The "Brain")
          this.vectorIndex.delete(id);
          
          console.log(`[SCALPEL] MemoryNode ${id} surgically removed from vector space.`);
          window.dispatchEvent(new Event('vault-update'));
      }
  }

  // --- DATA LOADING ---

  private async loadData(isDecoy: boolean) {
    this.memories = [];
    this.vectorIndex.clear();
    this.apiConfigs = [];

    if (isDecoy) {
        // Initialize Empty Decoy State
        this.initializeApiConfigs();
        return;
    }
    
    console.log("Vault Core: Initializing Vector Index...");
    
    for (const m of MOCK_INITIAL_MEMORIES) {
        const embedding = await generateEmbedding(m.content + " " + m.tags.join(" "));
        
        const memory: MemoryNode = {
            ...m,
            vectorId: `vec-${m.id}`,
            semanticHash: `hash-${m.id}`,
            emotion: Emotion.NEUTRAL,
            origin: m.origin as OriginSource,
            lastAccessed: Date.now(),
            isSynced: m.isSynced || false,
            isUserAuthored: m.isUserAuthored
        };
        
        this.memories.push(memory);
        this.vectorIndex.set(memory.id, embedding);
    }

    this.initializeApiConfigs();
  }

  private initializeApiConfigs() {
    if (process.env.API_KEY) {
        const defaultConfig: ApiConfig = {
            id: 'default-gemini',
            provider: 'GOOGLE',
            name: 'System Gemini Flash',
            apiKey: process.env.API_KEY,
            modelId: 'gemini-2.5-flash',
            isActive: true
        };
        this.apiConfigs.push(defaultConfig);
        this.activeApiId = defaultConfig.id;
    } else {
        this.apiConfigs.push({ id: 'demo-google', provider: 'GOOGLE', name: 'Gemini 1.5 Pro', modelId: 'gemini-1.5-pro-latest', isActive: true });
        this.apiConfigs.push({ id: 'demo-openai', provider: 'OPENAI', name: 'OpenAI GPT-4o', modelId: 'gpt-4o', isActive: false });
        this.activeApiId = 'demo-google';
    }
  }

  // --- THE RETRIEVAL LOOP ---

  public async semanticSearch(query: string, limit: number = 4): Promise<MemoryNode[]> {
    if (this.isLocked) return []; // Security Check

    const queryVector = await generateEmbedding(query);

    const scored = this.memories.map(mem => {
        const memVector = this.vectorIndex.get(mem.id);
        if (!memVector) return { mem, score: 0 };

        let similarity = cosineSimilarity(queryVector, memVector);

        const daysOld = (Date.now() - mem.timestamp) / (1000 * 60 * 60 * 24);
        if (daysOld < 1) similarity += 0.05;

        const queryLower = query.toLowerCase();
        mem.tags.forEach(tag => {
            if (queryLower.includes(tag.toLowerCase())) similarity += 0.2;
        });

        return { mem, score: similarity };
    });

    const results = scored
      .filter(s => s.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => {
        s.mem.lastAccessed = Date.now();
        return s.mem;
      });
    
    return results;
  }

  // --- THE INGESTION LOOP ---

  public async saveMemory(content: string, origin: OriginSource, isUserAuthored: boolean = false): Promise<MemoryNode> {
    if (this.isLocked) throw new Error("VAULT LOCKED");

    const chunks = chunkText(content);
    let primaryNode: MemoryNode | null = null;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isAutoSync = this.storageMode === StorageMode.AUTO_SYNC_ALL;
        const id = `mem-${Date.now()}-${i}`;

        const newNode: MemoryNode = {
          id: id,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          vectorId: `vec-${id}`,
          content: chunk,
          semanticHash: `hash-${chunk.length}`,
          emotion: Emotion.NEUTRAL,
          origin: origin,
          tags: ['ingest'], 
          decayFactor: 1.0,
          isSynced: isAutoSync,
          isUserAuthored: isUserAuthored
        };

        const vector = await generateEmbedding(chunk);
        
        this.memories.push(newNode);
        this.vectorIndex.set(id, vector);
        
        if (i === 0) primaryNode = newNode;
    }
    
    // Simulate Cloud Mirror Encrypt & Upload
    if (this.isCloudSyncActive) {
        setTimeout(() => {
            console.log("☁️ [CLOUD MIRROR] Encrypting Blob > Uploading to S3 Bucket...");
        }, 2000);
    }

    return primaryNode!;
  }

  public async ingestFile(file: File): Promise<MemoryNode> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const content = `[FILE: ${file.name} (${file.type})] \n\nSimulated extracted text content.`;
      return this.saveMemory(content, OriginSource.IMPORTED_FILE, false);
  }

  // --- ACCESSORS ---

  public getMemoriesByIds(ids: string[]): MemoryNode[] { return this.memories.filter(m => ids.includes(m.id)); }
  public getAllMemories(): MemoryNode[] { return [...this.memories].sort((a, b) => b.timestamp - a.timestamp); }

  public getStats() {
    return {
      totalMemories: this.memories.length,
      syncedMemories: this.memories.filter(m => m.isSynced).length,
      lastSync: new Date().toISOString(),
      isCloudMirrorActive: this.isCloudSyncActive
    };
  }

  public getStorageMode(): StorageMode { return this.storageMode; }
  public setStorageMode(mode: StorageMode) { this.storageMode = mode; }
  
  public getActivePersona(): PersonaProfile { return this.activePersona; }
  public setActivePersona(persona: PersonaProfile) { this.activePersona = persona; }

  public getApiConfigs(): ApiConfig[] { return this.apiConfigs; }
  public getActiveApiConfig(): ApiConfig | undefined { return this.apiConfigs.find(c => c.id === this.activeApiId); }
  public setActiveApi(id: string) { this.activeApiId = id; this.apiConfigs.forEach(c => c.isActive = c.id === id); }
  public addApiConfig(config: Omit<ApiConfig, 'id' | 'isActive'>) {
      const newConfig = { ...config, id: `api-${Date.now()}`, isActive: false };
      this.apiConfigs.push(newConfig);
      return newConfig;
  }
  public deleteApiConfig(id: string) {
      this.apiConfigs = this.apiConfigs.filter(c => c.id !== id);
      if (this.activeApiId === id && this.apiConfigs.length > 0) this.activeApiId = this.apiConfigs[0].id;
  }
  
  public getIsDuress(): boolean { return this.isDuressMode; }
}

export const vault = new VaultKernel();