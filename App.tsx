import React, { useState, useEffect } from 'react';
import ContextRail from './components/MemoryStream'; 
import ChatInterface from './components/ChatInterface';
import MemoryLibrary from './components/MemoryLibrary';
import PersonaConfigurator from './components/PersonaConfigurator';
import ApiDashboard from './components/ApiDashboard';
import LoginScreen from './components/LoginScreen';
import { vault } from './services/vaultService';
import { licenseManager } from './services/licenseManager';
import { MemoryNode, StorageMode, PersonaProfile, ChatMessage } from './types';
import { APP_NAME } from './constants';

type ViewState = 'CHAT' | 'LIBRARY' | 'APIS';

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 3000); // 3s Boot Sequence
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 animate-in fade-in duration-1000">
                {/* The Nexus Cube Construction */}
                <div className="absolute inset-0 border-2 border-cyan-core/20 transform rotate-45 scale-75"></div>
                <div className="absolute inset-0 border-2 border-cyan-core/10 transform rotate-45 scale-90"></div>
                
                {/* The Cyan Core */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-core rounded-full shadow-[0_0_40px_rgba(36,224,232,0.6)] animate-pulse-core"></div>
                
                {/* Data Lines */}
                <div className="absolute inset-0 border-t border-b border-cyan-core/30 scale-x-0 animate-[spin_3s_linear_infinite] opacity-30"></div>
            </div>
            
            <div className="mt-8 text-center">
                <div className="text-[10px] font-mono text-cyan-core/80 tracking-[0.3em] animate-pulse">
                    MOUNTING SECURE VOLUME...
                </div>
                <div className="h-0.5 w-24 bg-cyan-900/50 mx-auto mt-4 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-core w-full animate-[translateX_1.5s_ease-in-out_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [view, setView] = useState<ViewState>('CHAT');
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [activeMemoryIds, setActiveMemoryIds] = useState<string[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>(StorageMode.SELECTIVE_MANUAL);
  const [activePersona, setActivePersona] = useState<PersonaProfile>(vault.getActivePersona());
  const [showPersonaConfig, setShowPersonaConfig] = useState(false);
  
  // HUD / Rail State
  const [liveInput, setLiveInput] = useState('');
  const [lastModelMessage, setLastModelMessage] = useState<ChatMessage | null>(null);
  const [pinnedMemoryIds, setPinnedMemoryIds] = useState<string[]>([]);

  // Stats for the dashboard
  const [stats, setStats] = useState({ 
      usedBytes: 0, 
      limitBytes: 100, 
      percentUsed: 0,
      localCount: 0, 
      cloudCount: 0, 
      cloudActive: false 
  });

  const loadData = () => {
    const mems = vault.getAllMemories();
    setMemories(mems);
    const s = vault.getStats();
    const mode = vault.getStorageMode();
    const persona = vault.getActivePersona();
    
    setStorageMode(mode);
    setActivePersona(persona);
    
    const limit = licenseManager.getStorageLimit();
    const percent = Math.min(100, (s.bytesUsed / limit) * 100);

    setStats({
        usedBytes: s.bytesUsed,
        limitBytes: limit,
        percentUsed: percent,
        localCount: s.totalMemories - s.syncedMemories,
        cloudCount: s.syncedMemories,
        cloudActive: s.isCloudMirrorActive
    });
  };

  useEffect(() => {
    if (isAuthenticated && !isBooting) {
        // SAFETY GUARD: Check if vault is actually locked (HMR or state desync)
        if (vault.getIsLocked()) {
             console.warn("Vault is locked but App is Authenticated. Resetting security context.");
             setIsAuthenticated(false);
             return;
        }

        loadData();
        const handleUpdate = () => loadData();
        window.addEventListener('vault-update', handleUpdate);
        
        // Navigation Event Listener for Deep Linking (e.g. from DropZone)
        const handleNavigate = (e: Event) => {
             const customEvent = e as CustomEvent;
             if (customEvent.detail?.view) {
                 setView(customEvent.detail.view);
             }
        };
        window.addEventListener('nexus-navigate', handleNavigate);

        return () => {
            window.removeEventListener('vault-update', handleUpdate);
            window.removeEventListener('nexus-navigate', handleNavigate);
        };
    }
  }, [isAuthenticated, isBooting]);

  const handleMemoriesActivated = (ids: string[]) => {
    setActiveMemoryIds(ids);
  };

  const handlePersonaUpdate = (newPersona: PersonaProfile) => {
    vault.setActivePersona(newPersona);
    setActivePersona(newPersona);
  };

  const handlePinMemory = (id: string) => {
      setPinnedMemoryIds(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
  };

  const formatBytes = (bytes: number) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // --- VAULT HEALTH WIDGET ---
  const VaultHealthWidget = () => {
      const radius = 24;
      const circumference = 2 * Math.PI * radius;
      const progress = stats.percentUsed;
      const offset = circumference - (progress / 100) * circumference;
      
      const isOverLimit = progress >= 100;
      const isHighUsage = progress > 80;
      // Use CSS variable color via Tailwind class logic or style override if needed
      // Updated to use 'text-cyan-core' for the healthy state to match the Cube
      const ringColor = isOverLimit ? 'text-red-500' : isHighUsage ? 'text-orange-500' : 'text-cyan-core';

      return (
          <div 
            onClick={() => window.open('https://nexusbank.ai/pricing?ref_app=desktop', '_blank')}
            className="flex flex-col gap-3 group cursor-pointer active:scale-95 transition-transform duration-200"
            title={licenseManager.getTier() === 'FREE' ? "Upgrade to Nexus Pro" : "Manage Subscription"}
          >
             <div className="flex items-center gap-4">
                 <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* Background Ring */}
                    <svg className="transform -rotate-90 w-16 h-16">
                        <circle
                            className="text-slate-800"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="32"
                            cy="32"
                        />
                        <circle
                            className={`${ringColor} transition-all duration-1000 ease-out`}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="32"
                            cy="32"
                        />
                    </svg>
                    {/* Center Shield / Cube Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className={`w-5 h-5 ${isOverLimit ? 'text-red-500 animate-pulse' : stats.cloudActive ? 'text-emerald-500' : 'text-slate-600'} drop-shadow-[0_0_8px_rgba(36,224,232,0.5)] group-hover:scale-110 transition-transform`} fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                        </svg>
                    </div>
                 </div>
                 
                 <div className="flex flex-col">
                     <span className={`text-[10px] uppercase font-bold tracking-wider transition-colors ${isOverLimit ? 'text-red-500' : 'text-slate-500 group-hover:text-cyan-core'}`}>
                         {isOverLimit ? 'STORAGE FULL' : 'Vault Capacity'}
                     </span>
                     <span className="text-sm font-mono text-slate-200">
                         {formatBytes(stats.usedBytes)} <span className="text-slate-600">/ {formatBytes(stats.limitBytes)}</span>
                     </span>
                     <div className="flex items-center gap-1.5 mt-1">
                         <div className={`w-1.5 h-1.5 rounded-full ${stats.cloudActive ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-500'}`}></div>
                         <span className={`text-[9px] font-bold ${stats.cloudActive ? 'text-emerald-500' : 'text-slate-500'}`}>
                             {licenseManager.getTier() === 'FREE' ? 'FREE TIER (LOCAL)' : 'NEXUS PRO'}
                         </span>
                     </div>
                 </div>
             </div>
          </div>
      );
  };

  if (isBooting) {
      return <SplashScreen onComplete={() => setIsBooting(false)} />;
  }

  if (!isAuthenticated) {
      return <LoginScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-black text-slate-200 overflow-hidden font-sans selection:bg-cyan-core/30">
      
      {/* Left Sidebar: "Deep Matte Black" */}
      <div className="w-72 relative flex flex-col flex-shrink-0 z-20 bg-brand-black border-r border-white/5">
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                {/* Cube Icon for Brand */}
                <div className={`w-3 h-3 mr-3 shadow-[0_0_10px_rgba(36,224,232,0.5)] ${vault.getIsDuress() ? 'bg-slate-500' : 'bg-cyan-core animate-pulse-core'}`}></div>
                <h1 className="text-lg font-bold tracking-widest text-slate-100 font-mono">{APP_NAME}</h1>
            </div>
            
            {/* Main Navigation */}
            <div className="p-4 space-y-2 flex-1">
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2 ml-2">Modules</div>
                
                {[
                    { id: 'CHAT', label: 'FOCUS', sub: 'Active Stream', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
                    { id: 'LIBRARY', label: 'VAULT', sub: 'Knowledge Graph', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
                    { id: 'APIS', label: 'NEXUS', sub: 'Model Routing', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
                ].map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => setView(item.id as ViewState)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 group active:scale-95 ${
                            view === item.id 
                            ? 'bg-white/5 text-cyan-core shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-white/5' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                        }`}
                    >
                        <div className="p-1.5 rounded-lg text-slate-600 group-hover:text-slate-300 transition-colors">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="font-semibold tracking-wide">{item.label}</span>
                            <span className="text-[10px] opacity-50 font-mono">{item.sub}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Persona Selector */}
            <div className="p-4 border-t border-white/5">
                <button 
                onClick={() => setShowPersonaConfig(true)}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900 border border-white/5 hover:border-cyan-core/30 transition-all active:scale-95 group text-left relative overflow-hidden"
                >
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: activePersona.avatarColor, backgroundColor: activePersona.avatarColor }}></div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{activePersona.name}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">{activePersona.role}</div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Vault Health Widget */}
            <div className="p-6 border-t border-white/5 bg-black/20">
                <VaultHealthWidget />
            </div>
        </div>
      </div>

      {/* Center Area: Dynamic View */}
      <div className="flex-1 relative z-0 flex flex-col min-w-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>
        
        {view === 'CHAT' && (
             <ChatInterface 
                onMemoriesActivated={handleMemoriesActivated} 
                onNewMemory={loadData}
                onOpenLibrary={() => setView('LIBRARY')}
                onInputChange={setLiveInput}
                onModelOutput={setLastModelMessage}
                pinnedMemoryIds={pinnedMemoryIds}
                activePersona={activePersona}
            />
        )}
        {view === 'LIBRARY' && <MemoryLibrary memories={memories} />}
        {view === 'APIS' && <ApiDashboard />}
      </div>

      {/* Right Sidebar: Context Rail */}
      {view === 'CHAT' && (
        <div className="w-80 relative z-10 border-l border-white/5 backdrop-blur-md bg-brand-black/90 shadow-2xl">
            <ContextRail 
                liveInput={liveInput}
                lastModelMessage={lastModelMessage}
                activeMemoryIds={activeMemoryIds}
                pinnedMemoryIds={pinnedMemoryIds}
                onPinMemory={handlePinMemory}
            />
        </div>
      )}

      {/* Modals */}
      {showPersonaConfig && (
        <PersonaConfigurator 
          currentPersona={activePersona}
          onSelect={handlePersonaUpdate}
          onClose={() => setShowPersonaConfig(false)}
        />
      )}

    </div>
  );
};

export default App;