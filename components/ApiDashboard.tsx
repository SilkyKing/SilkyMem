import React, { useState, useEffect } from 'react';
import { ApiConfig, ApiProviderType } from '../types';
import { vault } from '../services/vaultService';

interface ApiDashboardProps {
    // none needed, uses vault
}

const ApiDashboard: React.FC<ApiDashboardProps> = () => {
    const [configs, setConfigs] = useState<ApiConfig[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    // Omega Protocol State
    const [showOmegaModal, setShowOmegaModal] = useState(false);
    const [omegaPhrase, setOmegaPhrase] = useState('');
    
    // Form State
    const [newName, setNewName] = useState('');
    const [newProvider, setNewProvider] = useState<ApiProviderType>('GOOGLE');
    const [newKey, setNewKey] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [newModel, setNewModel] = useState('');

    useEffect(() => {
        refresh();
    }, []);

    const refresh = () => {
        setConfigs([...vault.getApiConfigs()]);
        const active = vault.getActiveApiConfig();
        setActiveId(active ? active.id : null);
    };

    const handleActivate = (id: string) => {
        vault.setActiveApi(id);
        refresh();
    };

    const handleDelete = (id: string) => {
        vault.deleteApiConfig(id);
        refresh();
    };

    const handleAdd = () => {
        if (!newName) return;
        
        vault.addApiConfig({
            provider: newProvider,
            name: newName,
            apiKey: newKey,
            baseUrl: newUrl || undefined,
            modelId: newModel || undefined
        });
        
        // Reset form
        setIsAdding(false);
        setNewName('');
        setNewKey('');
        setNewUrl('');
        setNewModel('');
        refresh();
    };

    const handleOmegaExecute = async () => {
        if (omegaPhrase === 'DELETE FOREVER') {
            await vault.executeOmegaProtocol();
        }
    };

    const getProviderIcon = (type: ApiProviderType) => {
        switch(type) {
            case 'GOOGLE': 
                return (
                    <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                );
            case 'OPENAI':
                 return (
                    <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 1.6573-4.0241 1.6132 1.703.1468.0892a4.4899 4.4899 0 0 1-2.0477 2.4049v.9521zm-1.7595-13.8097a4.4947 4.4947 0 0 1 1.3304-.8046l-.0892-.1468L10.5223 4.172l-2.2367 1.2514-.0843.1419a4.4995 4.4995 0 0 1 2.6669.4461h.3921zm5.4176 2.7925a4.4947 4.4947 0 0 1 .6327 1.419l.0843.1419-2.2367 3.6913-2.2367-1.2466-.0892-.1468a4.4947 4.4947 0 0 1 2.5152-3.8588h.3921v1.0408z"/></svg>
                 );
            case 'ANTHROPIC':
                return (
                    <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="0"></circle></svg>
                );
            case 'GROQ':
                return (
                    <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                );
            case 'MISTRAL':
                return (
                    <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                );
            case 'CUSTOM_LOCAL':
                return (
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                );
            default:
                return <div className="w-6 h-6 rounded bg-slate-700"></div>;
        }
    };

    return (
        <div className="h-full w-full bg-slate-950 flex flex-col text-slate-200 overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-slate-800 bg-slate-950 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50"></div>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                            API NEXUS
                            <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-1 rounded border border-cyan-800">POLYGLOT ROUTER</span>
                        </h1>
                        <p className="text-slate-500 mt-2 font-mono text-sm">Manage external intelligence bridges and local inference endpoints.</p>
                    </div>
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-cyan-400 px-4 py-2 rounded transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        NEW BRIDGE
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pb-32">
                
                {/* Add New Form */}
                {isAdding && (
                    <div className="mb-8 bg-slate-900/50 border border-slate-700 rounded-lg p-6 animate-in fade-in slide-in-from-top-4">
                        <h3 className="text-cyan-400 font-mono text-sm uppercase mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            Initialize New Connection
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase mb-2">Friendly Name</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm focus:border-cyan-500 outline-none font-mono"
                                    placeholder="e.g. Local Llama 3"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase mb-2">Provider Protocol</label>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm focus:border-cyan-500 outline-none font-mono text-slate-300"
                                    value={newProvider}
                                    onChange={e => setNewProvider(e.target.value as ApiProviderType)}
                                >
                                    <option value="GOOGLE">Google Gemini</option>
                                    <option value="OPENAI">OpenAI (GPT-4o)</option>
                                    <option value="ANTHROPIC">Anthropic (Claude 3.5)</option>
                                    <option value="GROQ">Meta Llama 3 (via Groq)</option>
                                    <option value="MISTRAL">Mistral AI</option>
                                    <option value="CUSTOM_LOCAL">Custom / Local (OpenAI Format)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase mb-2">API Key / Secret</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm focus:border-cyan-500 outline-none font-mono"
                                    placeholder={newProvider === 'CUSTOM_LOCAL' ? "Optional for some local servers" : "sk-..."}
                                    value={newKey}
                                    onChange={e => setNewKey(e.target.value)}
                                />
                            </div>

                            {newProvider === 'CUSTOM_LOCAL' && (
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase mb-2">Endpoint URL</label>
                                    <input 
                                        className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm focus:border-cyan-500 outline-none font-mono"
                                        placeholder="http://localhost:11434/v1"
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase mb-2">Model ID (Optional Override)</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-sm focus:border-cyan-500 outline-none font-mono"
                                    placeholder={newProvider === 'GOOGLE' ? 'gemini-2.5-flash' : 'llama-3-8b-instruct'}
                                    value={newModel}
                                    onChange={e => setNewModel(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                            <button 
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-xs text-slate-500 hover:text-white transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleAdd}
                                disabled={!newName}
                                className="px-6 py-2 bg-cyan-900 text-cyan-100 text-xs font-bold rounded hover:bg-cyan-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ESTABLISH BRIDGE
                            </button>
                        </div>
                    </div>
                )}

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {configs.map(config => (
                        <div 
                            key={config.id}
                            className={`
                                relative p-6 rounded-xl border transition-all duration-300 group
                                ${config.isActive 
                                    ? 'bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'}
                            `}
                        >
                            {config.isActive && (
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                    </span>
                                    <span className="text-[10px] font-mono text-cyan-500 uppercase">Active Uplink</span>
                                </div>
                            )}

                            <div className="flex items-start gap-4 mb-4">
                                <div className={`p-3 rounded-lg ${config.isActive ? 'bg-cyan-950/30' : 'bg-slate-900'}`}>
                                    {getProviderIcon(config.provider)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-200 text-lg">{config.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono uppercase mt-1">{config.provider} // {config.modelId || 'Default Model'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                                    <span className="text-slate-600">Status</span>
                                    <span className={config.isActive ? 'text-emerald-500' : 'text-slate-500'}>
                                        {config.isActive ? 'CONNECTED' : 'STANDBY'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                                    <span className="text-slate-600">Endpoint</span>
                                    <span className="text-slate-400 font-mono truncate max-w-[150px]">
                                        {config.baseUrl || 'Cloud Native'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs py-1 border-b border-slate-800/50">
                                    <span className="text-slate-600">Key Hash</span>
                                    <span className="text-slate-400 font-mono">
                                        {config.apiKey ? '••••' + config.apiKey.slice(-4) : 'NONE'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-auto">
                                {!config.isActive && (
                                    <button 
                                        onClick={() => handleActivate(config.id)}
                                        className="flex-1 py-2 bg-slate-800 hover:bg-cyan-900/30 hover:text-cyan-400 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors"
                                    >
                                        ACTIVATE
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(config.id)}
                                    className="px-3 py-2 bg-slate-950 hover:bg-red-900/20 hover:text-red-400 text-slate-600 text-xs rounded border border-slate-800 transition-colors"
                                    title="Disconnect Bridge"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DANGER ZONE */}
                <div className="mt-12 border border-red-900/30 bg-red-950/10 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                         <svg className="w-32 h-32 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    
                    <h3 className="text-red-500 font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Danger Zone
                    </h3>
                    <p className="text-slate-400 text-sm mb-6 max-w-xl">
                        Emergency cryptographic controls. Actions taken here are irreversible and will result in the permanent destruction of local encryption keys and cloud mirrors.
                    </p>
                    
                    <button 
                        onClick={() => setShowOmegaModal(true)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase text-xs rounded shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        INITIATE PROTOCOL OMEGA
                    </button>
                </div>

            </div>

            {/* OMEGA MODAL */}
            {showOmegaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-slate-900 border-2 border-red-600 rounded-xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mb-4 text-red-500 animate-pulse">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Protocol Omega</h2>
                            <p className="text-slate-400 text-sm">
                                This will destroy the Master Encryption Key and overwrite all memory vectors with zeros. Data will be unrecoverable.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] text-red-500 uppercase font-bold mb-2">Type "DELETE FOREVER" to confirm</label>
                            <input 
                                type="text"
                                className="w-full bg-black border border-red-900 rounded p-3 text-center text-red-500 font-mono tracking-widest focus:border-red-500 outline-none"
                                value={omegaPhrase}
                                onChange={e => setOmegaPhrase(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setShowOmegaModal(false); setOmegaPhrase(''); }}
                                className="flex-1 py-3 text-slate-500 hover:text-white text-xs font-bold uppercase transition-colors"
                            >
                                Abort
                            </button>
                            <button 
                                onClick={handleOmegaExecute}
                                disabled={omegaPhrase !== 'DELETE FOREVER'}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded shadow-lg shadow-red-600/20 transition-all"
                            >
                                Execute Wipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiDashboard;