import { UserIdentity } from '../types';

export const STORAGE_LIMITS = {
  FREE: 100 * 1024 * 1024,      // 100 MB
  PRO: 10 * 1024 * 1024 * 1024, // 10 GB
  LIFETIME: 100 * 1024 * 1024 * 1024 // 100 GB
};

export type SubscriptionTier = 'FREE' | 'PRO' | 'LIFETIME';

class LicenseManager {
  private currentTier: SubscriptionTier = 'FREE';
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    await this.pollEntitlements();
    this.pollingInterval = setInterval(() => this.pollEntitlements(), 1000 * 60 * 10); // Poll every 10 mins
  }

  public async pollEntitlements() {
    // Mock API call to Auth Provider (Supabase/Clerk)
    // In production: const profile = await fetch('/api/user/profile');
    
    // Simulating a check against local storage or env for demo purposes
    const storedTier = localStorage.getItem('nexus_license_tier');
    if (storedTier && ['FREE', 'PRO', 'LIFETIME'].includes(storedTier)) {
        this.currentTier = storedTier as SubscriptionTier;
    } else {
        this.currentTier = 'FREE';
    }
    
    // console.debug(`[LicenseManager] Entitlements synced. Tier: ${this.currentTier}`);
  }

  public getStorageLimit(): number {
    return STORAGE_LIMITS[this.currentTier];
  }

  public hasCloudEntitlement(): boolean {
    return this.currentTier !== 'FREE';
  }

  public getTier(): SubscriptionTier {
    return this.currentTier;
  }

  // Debug helper to upgrade tier
  public debugUpgrade(tier: SubscriptionTier) {
      this.currentTier = tier;
      localStorage.setItem('nexus_license_tier', tier);
  }
}

export const licenseManager = new LicenseManager();