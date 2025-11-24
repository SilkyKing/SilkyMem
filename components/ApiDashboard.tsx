
import React, { useState, useEffect } from 'react';
import { ApiConfig, ApiProviderType } from '../types';
import { vault } from '../services/vaultService';

interface ApiDashboardProps {}

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
            modelId: newModel || undefined
        });
        
        // Reset form
        setIsAdding(false);
        setNewName('');
        setNewKey('');
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
                return <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>;
            case 'OPENAI':
                 return <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 1.6573-4.0241 1.6132 1.703.1468.0892a4.4899 4.4899 0 0 1-2.0477 2.4049v.9521zm-1.7595-13.8097a4.4947 4.4947 0 0 1 1.3304-.8046l-.0892-.1468L10.5223 4.172l-2.2367 1.2514-.0843.1419a4.4995 4.4995 0 0 1 2.6669.4461h.3921zm5.4176 2.7925a4.4947 4.4947 0 0 1 .6327 1.419l.0843.1419-2.2367 3.6913-2.2367-1.2466-.0892-.1468a4.4947 4.4947 0 0 1 2.5152-3.8588h.3921v1.0408z"/></svg>;
            case 'ANTHROPIC':
                return <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="0"></circle><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/></svg>;
            case 'GROQ':
                return <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.2 8.4l-1.6 2.8c-.2.3-.5.5-.9.5h-2.8l1.6-2.8c.2-.3.5-.5.9-.5h2.8zm-4.4 7.2l-1.6-2.8h2.8c.4 0 .7.2.9.5l1.6 2.8h-2.8c-.4 0-.7-.2-.9-.5zM7.2 9.6l1.6-2.8h2.8c.4 0 .7.2.9.5l1.6 2.8H11.3c-.4 0-.7-.2-.9-.5L8.8 9.6h-1.6z"/></svg>; // Meta Infinite Logo Proxy
            case 'MISTRAL':
                return <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8zm-2 0h4m16 0h4M12 4v4m0 16v-4" /></svg>; // Wave Proxy
            case 'XAI':
                return <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>;
            default:
                return <div className="w-5 h-5 rounded bg-slate-700"></div>;
        }
    };

    return (
        <div className="h-full w-full bg-slate-950 flex flex-col text-slate-200 overflow-hidden relative">
            {/* Settings Header */}
            <div className="p-8 border-b border-slate-800 bg-slate-950 relative">
                 <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-3">
                            SYSTEM SETTINGS
                        </h1>
                        <p className="text-slate-500 mt-1 font-mono text-xs">Configure Secure Enclave & Intelligence Routing</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">VERSION 2.1.0-ELECTRON</span>
                    </div>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pb-32">
                
                {/* 1. SECURE KEYCHAIN SECTION */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-cyan-400 font-mono text-sm uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Secure Keychain
                        </h2>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="text-xs bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 px-3 py-1.5 rounded border border-cyan-500/30 transition-all"
                        >
                            + ADD KEY
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {configs.map(config => (
                            <div key={config.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex items-center justify-between group hover:border-slate-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md ${config.isActive ? 'bg-cyan-950/50 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {getProviderIcon(config.provider)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-200">{config.name}</div>
                                        <div className="text-[10px] font-mono text-slate-500">
                                            {config.provider === 'GROQ' ? 'META (via GROQ)' : config.provider} • {config.modelId || 'Default'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleActivate(config.id)}
                                        className={`text-[10px] font-bold px-2 py-1 rounded border ${config.isActive ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                                    >
                                        {config.isActive ? 'ACTIVE' : 'ENABLE'}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(config.id)}
                                        className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {configs.length === 0 && (
                            <div className="col-span-2 text-center py-8 border border-dashed border-slate-800 rounded-lg text-slate-600 text-xs font-mono">
                                NO KEYS IN SECURE ENCLAVE
                            </div>
                        )}
                    </div>
                </div>

                {/* ADD KEY FORM */}
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                            <h3 className="text-lg font-bold text-white mb-6">Add Secure Credential</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Provider</label>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {['GOOGLE', 'OPENAI', 'ANTHROPIC'].map((p) => (
                                            <button 
                                                key={p}
                                                onClick={() => setNewProvider(p as ApiProviderType)}
                                                className={`py-2 text-[10px] font-bold rounded border ${newProvider === p ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {[
                                            { id: 'GROQ', label: 'META (GROQ)' },
                                            { id: 'MISTRAL', label: 'MISTRAL' },
                                            { id: 'XAI', label: 'XAI (GROK)' }
                                        ].map((p) => (
                                            <button 
                                                key={p.id}
                                                onClick={() => setNewProvider(p.id as ApiProviderType)}
                                                className={`py-2 text-[10px] font-bold rounded border ${newProvider === p.id ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">Name</label>
                                    <input 
                                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
                                        placeholder={newProvider === 'XAI' ? "Grok Beta" : "e.g. Work GPT-4"}
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold">API Secret Key</label>
                                    <input 
                                        type="password"
                                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-200 outline-none focus:border-cyan-500 font-mono"
                                        placeholder="sk-..."
                                        value={newKey}
                                        onChange={e => setNewKey(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-white">CANCEL</button>
                                <button onClick={handleAdd} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded">SAVE TO KEYCHAIN</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. DANGER ZONE */}
                <div className="mt-12 pt-8 border-t border-slate-800/50">
                    <h2 className="text-red-500 font-mono text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Protocol Omega
                    </h2>
                    
                    <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-slate-200 font-bold mb-1">Cryptographic Shredding</h3>
                            <p className="text-xs text-slate-500 max-w-md">
                                Execute a multi-pass overwrite of the SQLite database and destroy the encryption master key. This action is irreversible.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowOmegaModal(true)}
                            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded shadow-lg shadow-red-600/20 active:scale-95 transition-all whitespace-nowrap"
                        >
                            INITIATE WIPE
                        </button>
                    </div>
                </div>

            </div>

            {/* OMEGA MODAL */}
            {showOmegaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
                    <div className="bg-slate-900 border-2 border-red-600 rounded-xl p-8 max-w-md w-full shadow-[0_0_100px_rgba(220,38,38,0.2)] animate-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4 text-red-500 animate-pulse">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Protocol Omega</h2>
                            <p className="text-red-400 text-xs font-mono">WARNING: DESTRUCTIVE ACTION</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 text-center">Type "DELETE FOREVER" to confirm</label>
                            <input 
                                type="text"
                                className="w-full bg-black border border-red-900 rounded p-3 text-center text-red-500 font-mono tracking-widest focus:border-red-500 outline-none uppercase"
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
                                Cancel
                            </button>
                            <button 
                                onClick={handleOmegaExecute}
                                disabled={omegaPhrase !== 'DELETE FOREVER'}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded shadow-lg shadow-red-600/20 transition-all"
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApiDashboard;
