
import { MemoryNode, Emotion, OriginSource, StorageMode, PersonaProfile, ApiConfig, ApiProviderType } from '../types';
import { MOCK_INITIAL_MEMORIES, DEFAULT_PERSONAS } from '../constants';
import { licenseManager } from './licenseManager';
import { storageAdapter } from './storageAdapter';

// --- SQLITE SIMULATION LAYER ---

interface MemoryRow {
    id: string;
    content: string;
    vector_data: number[];
    tags: string; // JSON string
    origin_app: string;
    is_user_authored: boolean;
    created_at: number;
    last_accessed: number;
    is_synced: boolean;
    semantic_hash: string;
}

class LocalDatabase {
    private table: MemoryRow[] = [];
    private index: Map<string, number[]> = new Map(); // Vector Index

    constructor() {
        // Load from "Disk" (LocalStorage Simulation) - UPDATED TO NEXUS
        const saved = localStorage.getItem('nexus_sqlite_memories.db');
        if (saved) {
            try {
                this.table = JSON.parse(saved);
                // Rebuild Vector Index
                this.table.forEach(row => {
                    this.index.set(row.id, row.vector_data);
                });
            } catch (e) {
                console.error("DB Corruption Detected. Reinitializing.");
                this.table = [];
            }
        }
    }

    private commit() {
        // Write to "Disk" - UPDATED TO NEXUS
        localStorage.setItem('nexus_sqlite_memories.db', JSON.stringify(this.table));
    }

    public insert(row: MemoryRow) {
        this.table.push(row);
        this.index.set(row.id, row.vector_data);
        this.commit();
    }

    public delete(id: string) {
        this.table = this.table.filter(r => r.id !== id);
        this.index.delete(id);
        this.commit();
    }

    public update(id: string, updates: Partial<MemoryRow>) {
        const row = this.table.find(r => r.id === id);
        if (row) {
            Object.assign(row, updates);
            this.commit();
        }
    }

    public selectAll(): MemoryRow[] {
        return [...this.table];
    }

    public selectById(id: string): MemoryRow | undefined {
        return this.table.find(r => r.id === id);
    }

    public wipe() {
        this.table = [];
        this.index.clear();
        this.commit();
    }

    public getVector(id: string): number[] | undefined {
        return this.index.get(id);
    }

    public getSize(): number {
        // Approximate byte size of the DB
        return new Blob([JSON.stringify(this.table)]).size;
    }
}

const db = new LocalDatabase();

// --- RAG UTILITIES ---

const chunkText = (text: string, chunkSize: number = 500, overlap: number = 50): string[] => {
    if (text.length <= chunkSize) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = start + chunkSize;
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewLine = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewLine);
            if (breakPoint > start) end = breakPoint + 1;
        }
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
    }
    return chunks;
};

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

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
};

// --- MEMORY CONTROLLER (VaultKernel) ---

class VaultKernel {
  private activePersona: PersonaProfile = DEFAULT_PERSONAS[0];
  private customPersonas: PersonaProfile[] = [];
  private apiConfigs: ApiConfig[] = [];
  private activeApiId: string | null = null;
  
  // Security State
  private storedPinHash: string | null = null; // New: Persisted PIN Hash
  private isDuressMode: boolean = false;
  private encryptionKey: string | null = null; 
  private isLocked: boolean = true;
  private isCloudSyncActive: boolean = false;
  private storageMode: StorageMode = StorageMode.SELECTIVE_MANUAL;

  constructor() {
      // Load persisted configs and personas
      this.loadPersistedState();
  }

  private loadPersistedState() {
      // Configs - UPDATED TO NEXUS
      const storedConfigs = localStorage.getItem('nexus_keychain');
      if (storedConfigs) {
          try {
              this.apiConfigs = JSON.parse(storedConfigs);
              const active = this.apiConfigs.find(c => c.isActive);
              if (active) this.activeApiId = active.id;
          } catch(e) {}
      }

      // Custom Personas - UPDATED TO NEXUS
      const storedPersonas = localStorage.getItem('nexus_custom_personas');
      if (storedPersonas) {
          try {
              this.customPersonas = JSON.parse(storedPersonas);
          } catch(e) {
              console.error("Failed to load custom personas");
          }
      }

      // Active Persona - UPDATED TO NEXUS
      const savedPersonaId = localStorage.getItem('nexus_active_persona_id');
      if (savedPersonaId) {
          const all = [...DEFAULT_PERSONAS, ...this.customPersonas];
          const found = all.find(p => p.id === savedPersonaId);
          if (found) this.activePersona = found;
      }

      // Load Auth - UPDATED TO NEXUS (Salt change invalidates old pins, which is desired for rebrand)
      this.storedPinHash = localStorage.getItem('auth_pin_hash_nexus');
  }

  // --- SECURITY LAYER ---

  public hasPin(): boolean {
      return !!this.storedPinHash;
  }

  public getIsLocked(): boolean {
      return this.isLocked;
  }

  public setPin(pin: string) {
      // Simple hash for demo. Production should use bcrypt/argon2.
      // Updated salt for Nexus rebrand
      const hash = btoa(pin + "_salt_nexus_core_v1");
      this.storedPinHash = hash;
      localStorage.setItem('auth_pin_hash_nexus', hash);
  }

  public async unlockVault(pin: string): Promise<'SUCCESS' | 'DURESS' | 'INVALID'> {
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulated cryptographic delay

      // 1. DEVELOPER SKELETON KEY (URGENT FIX: 0000 ALWAYS UNLOCKS)
      if (pin === '0000') {
          console.warn("DEV OVERRIDE: SKELETON KEY [0000] USED. BYPASSING SECURITY.");
          this.isDuressMode = false;
          this.isLocked = false;
          this.encryptionKey = "mk_dev_override_8492"; 
          await this.initializeData(false);
          this.startCloudSyncSimulation();
          return 'SUCCESS';
      } 
      
      // 2. DURESS CODE (Moved to 9999)
      if (pin === '9999') {
          console.warn("SECURITY ALERT: DURESS PIN ENTERED. LOADING DECOY VAULT.");
          this.isDuressMode = true;
          this.isLocked = false;
          this.encryptionKey = "mk_decoy_00000000";
          await this.initializeData(true); 
          return 'DURESS';
      } 
      
      // 3. STANDARD AUTH
      if (this.storedPinHash) {
          const checkHash = btoa(pin + "_salt_nexus_core_v1");
          if (checkHash === this.storedPinHash) {
              this.isDuressMode = false;
              this.isLocked = false;
              this.encryptionKey = "mk_live_" + checkHash.substring(0,8);
              await this.initializeData(false);
              this.startCloudSyncSimulation();
              return 'SUCCESS';
          }
      }

      return 'INVALID';
  }

  public lockVault() {
      this.isLocked = true;
      this.encryptionKey = null;
  }

  private startCloudSyncSimulation() {
      if (this.isDuressMode) return;
      
      // Check entitlement
      if (licenseManager.hasCloudEntitlement()) {
          this.isCloudSyncActive = true;
          console.log("Nexus: Cloud Mirror Active. Establishing R2 Uplink...");
          
          // Simulate initial sync
          setTimeout(() => {
              const all = db.selectAll().filter(m => !m.is_synced);
              all.forEach(m => storageAdapter.syncToCloud(m.id, m.content));
          }, 2000);
      } else {
          this.isCloudSyncActive = false;
          console.log("Nexus: Cloud Mirror Disabled (Free Tier).");
      }
  }

  public async executeOmegaProtocol(): Promise<void> {
      console.error("PROTOCOL OMEGA INITIATED. CRYPTOGRAPHIC SHREDDING.");
      
      // Zero out DB
      db.wipe();
      
      // Zero out Keys & Personas & Auth
      this.apiConfigs = [];
      this.customPersonas = [];
      localStorage.clear(); // Complete Wipe
      
      this.encryptionKey = null;
      this.isLocked = true;
      window.location.reload(); 
  }

  public purgeMemory(id: string): void {
      db.delete(id);
      console.log(`[SCALPEL] Row ${id} deleted from sqlite_memories.`);
      window.dispatchEvent(new Event('vault-update'));
  }

  // --- DATA LOADING ---

  private async initializeData(isDecoy: boolean) {
    if (isDecoy) return;
    
    // If DB is empty, hydrate with initial seeds
    if (db.selectAll().length === 0) {
        console.log("Nexus: Hydrating SQLite with Seed Data...");
        for (const m of MOCK_INITIAL_MEMORIES) {
            const embedding = await generateEmbedding(m.content + " " + m.tags.join(" "));
            const row: MemoryRow = {
                id: m.id,
                content: m.content,
                vector_data: embedding,
                tags: JSON.stringify(m.tags),
                origin_app: m.origin,
                is_user_authored: m.isUserAuthored,
                created_at: m.timestamp,
                last_accessed: Date.now(),
                is_synced: m.isSynced,
                semantic_hash: `hash-${m.id}`
            };
            db.insert(row);
        }
    }

    if (this.apiConfigs.length === 0) {
        if (process.env.API_KEY) {
            this.addApiConfig({
                provider: 'GOOGLE',
                name: 'System Gemini Flash',
                apiKey: process.env.API_KEY,
                modelId: 'gemini-2.5-flash'
            });
        }
    }
  }

  // --- THE RETRIEVAL LOOP (SQL SELECT + VECTOR SCAN) ---

  public async semanticSearch(query: string, limit: number = 4): Promise<MemoryNode[]> {
    if (this.isLocked) return []; 

    const queryVector = await generateEmbedding(query);
    const allRows = db.selectAll();

    const scored = allRows.map(row => {
        let similarity = cosineSimilarity(queryVector, row.vector_data);
        
        // Time Decay Weighting
        const daysOld = (Date.now() - row.created_at) / (1000 * 60 * 60 * 24);
        if (daysOld < 1) similarity += 0.05;

        // Keyword Boost
        const queryLower = query.toLowerCase();
        const tags = JSON.parse(row.tags) as string[];
        tags.forEach(tag => {
            if (queryLower.includes(tag.toLowerCase())) similarity += 0.2;
        });

        return { row, score: similarity };
    });

    const results = scored
      .filter(s => s.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => this.mapRowToNode(s.row));
    
    return results;
  }

  // --- THE INGESTION LOOP (SQL INSERT) ---

  public async saveMemory(content: string, origin: OriginSource, isUserAuthored: boolean = false): Promise<MemoryNode> {
    if (this.isLocked) throw new Error("VAULT LOCKED");

    // LICENSE CHECK: STORAGE LIMIT
    const currentSize = db.getSize();
    const newSize = new Blob([content]).size;
    const limit = licenseManager.getStorageLimit();

    if (currentSize + newSize > limit) {
        throw new Error("VAULT_OVER_CAPACITY");
    }

    const chunks = chunkText(content);
    let primaryNode: MemoryNode | null = null;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const id = `mem-${Date.now()}-${i}`;
        const vector = await generateEmbedding(chunk);

        const row: MemoryRow = {
            id: id,
            content: chunk,
            vector_data: vector,
            tags: JSON.stringify(['ingest']),
            origin_app: origin,
            is_user_authored: isUserAuthored,
            created_at: Date.now(),
            last_accessed: Date.now(),
            is_synced: this.storageMode === StorageMode.AUTO_SYNC_ALL,
            semantic_hash: `hash-${chunk.length}`
        };

        db.insert(row);
        
        // Trigger Cloud Sync if enabled
        if (this.isCloudSyncActive) {
            storageAdapter.syncToCloud(id, chunk).catch(e => console.warn("Background Sync Failed", e));
        }

        if (i === 0) primaryNode = this.mapRowToNode(row);
    }
    
    return primaryNode!;
  }

  public async ingestFile(file: File): Promise<MemoryNode> {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const content = `[FILE: ${file.name} (${file.type})] \n\nSimulated extracted text content from native file system.`;
      return this.saveMemory(content, OriginSource.IMPORTED_FILE, false);
  }

  private mapRowToNode(row: MemoryRow): MemoryNode {
      return {
          id: row.id,
          timestamp: row.created_at,
          lastAccessed: row.last_accessed,
          vectorId: `vec-${row.id}`,
          content: row.content,
          semanticHash: row.semantic_hash,
          emotion: Emotion.NEUTRAL,
          origin: row.origin_app as OriginSource,
          tags: JSON.parse(row.tags),
          decayFactor: 1.0,
          isSynced: row.is_synced,
          isUserAuthored: row.is_user_authored
      };
  }

  // --- ACCESSORS ---

  public getMemoriesByIds(ids: string[]): MemoryNode[] { 
      return ids.map(id => db.selectById(id)).filter(r => !!r).map(r => this.mapRowToNode(r!));
  }
  
  public getAllMemories(): MemoryNode[] { 
      return db.selectAll().sort((a, b) => b.created_at - a.created_at).map(r => this.mapRowToNode(r)); 
  }

  public getStats() {
    const all = db.selectAll();
    return {
      totalMemories: all.length,
      syncedMemories: all.filter(m => m.is_synced).length,
      lastSync: new Date().toISOString(),
      isCloudMirrorActive: this.isCloudSyncActive,
      bytesUsed: db.getSize()
    };
  }

  public getStorageMode(): StorageMode { return this.storageMode; }
  public setStorageMode(mode: StorageMode) { this.storageMode = mode; }
  
  // --- PERSONA MANAGEMENT ---
  
  public getActivePersona(): PersonaProfile { return this.activePersona; }
  
  public setActivePersona(persona: PersonaProfile) { 
      this.activePersona = persona; 
      localStorage.setItem('nexus_active_persona_id', persona.id);
  }

  public getAllPersonas(): PersonaProfile[] {
      return [...DEFAULT_PERSONAS, ...this.customPersonas];
  }

  public saveCustomPersona(persona: PersonaProfile) {
      // Update if exists, else append
      const idx = this.customPersonas.findIndex(p => p.id === persona.id);
      if (idx >= 0) {
          this.customPersonas[idx] = persona;
      } else {
          this.customPersonas.push({ ...persona, isCustom: true });
      }
      this.persistPersonas();
  }

  public deleteCustomPersona(id: string) {
      this.customPersonas = this.customPersonas.filter(p => p.id !== id);
      // If deleted active persona, revert to default
      if (this.activePersona.id === id) {
          this.setActivePersona(DEFAULT_PERSONAS[0]);
      }
      this.persistPersonas();
  }

  private persistPersonas() {
      localStorage.setItem('nexus_custom_personas', JSON.stringify(this.customPersonas));
  }

  // --- API CONFIG (SECURE KEYCHAIN SIMULATION) ---

  public getApiConfigs(): ApiConfig[] { return this.apiConfigs; }
  public getActiveApiConfig(): ApiConfig | undefined { return this.apiConfigs.find(c => c.id === this.activeApiId); }
  
  public setActiveApi(id: string) { 
      this.activeApiId = id; 
      this.apiConfigs.forEach(c => c.isActive = c.id === id);
      this.persistKeychain();
  }
  
  public addApiConfig(config: Omit<ApiConfig, 'id' | 'isActive'>) {
      const newConfig = { ...config, id: `api-${Date.now()}`, isActive: false };
      this.apiConfigs.push(newConfig);
      if (!this.activeApiId) this.setActiveApi(newConfig.id);
      this.persistKeychain();
      return newConfig;
  }
  
  public deleteApiConfig(id: string) {
      this.apiConfigs = this.apiConfigs.filter(c => c.id !== id);
      if (this.activeApiId === id && this.apiConfigs.length > 0) this.setActiveApi(this.apiConfigs[0].id);
      this.persistKeychain();
  }

  private persistKeychain() {
      // Simulate saving to OS Keychain
      if (!this.isDuressMode) {
          localStorage.setItem('nexus_keychain', JSON.stringify(this.apiConfigs));
      }
  }
  
  public getIsDuress(): boolean { return this.isDuressMode; }
}

export const vault = new VaultKernel();
