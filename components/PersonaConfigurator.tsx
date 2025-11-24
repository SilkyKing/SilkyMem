
import React, { useState, useEffect } from 'react';
import { PersonaProfile } from '../types';
import { vault } from '../services/vaultService';

interface PersonaConfiguratorProps {
  currentPersona: PersonaProfile;
  onSelect: (persona: PersonaProfile) => void;
  onClose: () => void;
}

const COLORS = ['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

const PersonaConfigurator: React.FC<PersonaConfiguratorProps> = ({ currentPersona, onSelect, onClose }) => {
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [view, setView] = useState<'GRID' | 'CREATE' | 'EDIT'>('GRID');
  
  // Form State
  const [formData, setFormData] = useState<PersonaProfile>({
      id: '',
      name: '',
      role: '',
      tone: '',
      systemPrompt: '',
      avatarColor: COLORS[0],
      isCustom: true
  });

  useEffect(() => {
      refreshList();
  }, []);

  const refreshList = () => {
      setPersonas(vault.getAllPersonas());
  };

  const handleSelect = (persona: PersonaProfile) => {
    onSelect(persona);
    onClose();
  };

  const startCreate = () => {
      setFormData({
          id: `custom-${Date.now()}`,
          name: '',
          role: '',
          tone: '',
          systemPrompt: '',
          avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
          isCustom: true
      });
      setView('CREATE');
  };

  const startEdit = (e: React.MouseEvent, persona: PersonaProfile) => {
      e.stopPropagation();
      setFormData({ ...persona });
      setView('EDIT');
  };

  const handleSave = () => {
      if (!formData.name || !formData.systemPrompt) return;
      
      vault.saveCustomPersona(formData);
      refreshList();
      
      // If we edited the currently active persona, update app state immediately
      if (currentPersona.id === formData.id) {
          onSelect(formData);
      }
      
      setView('GRID');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Permanently decommission this agent protocol?')) {
          vault.deleteCustomPersona(id);
          refreshList();
          // If deleted active, update will happen automatically in App or next refresh, 
          // but let's be safe and check if we deleted the current one.
          if (currentPersona.id === id) {
             const all = vault.getAllPersonas();
             if (all.length > 0) onSelect(all[0]);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[800px] max-w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 tracking-wider font-mono">AGENT PROTOCOL CONFIGURATION</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                  {view === 'GRID' ? 'Select or Fabricate Identity' : view === 'CREATE' ? 'Initialize New Construct' : 'Modify Protocol Parameters'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* --- GRID VIEW --- */}
        {view === 'GRID' && (
             <div className="flex-1 overflow-y-auto p-8 bg-slate-900">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Existing Personas */}
                    {personas.map(p => (
                        <div 
                            key={p.id}
                            onClick={() => handleSelect(p)}
                            className={`
                                relative p-5 rounded-xl border transition-all cursor-pointer group overflow-hidden
                                ${currentPersona.id === p.id 
                                    ? 'bg-slate-800 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50' 
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800'}
                            `}
                        >
                            {/* Color Bar */}
                            <div className="absolute top-0 left-0 w-1.5 h-full transition-colors" style={{ backgroundColor: p.avatarColor }}></div>
                            
                            <div className="pl-3 relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-200 text-sm group-hover:text-white truncate pr-2">{p.name}</h3>
                                    {p.isCustom && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => startEdit(e, p)}
                                                className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/30 rounded"
                                                title="Edit Protocol"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, p.id)}
                                                className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded"
                                                title="Decommission"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono uppercase mb-3 truncate">{p.role}</p>
                                <div className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed opacity-70">
                                    {p.systemPrompt}
                                </div>
                            </div>

                            {/* Active Indicator */}
                            {currentPersona.id === p.id && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#06b6d4]"></div>
                            )}
                        </div>
                    ))}

                    {/* Create New Card */}
                    <button 
                        onClick={startCreate}
                        className="p-5 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all group min-h-[140px]"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-cyan-900/20 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Initialize New Protocol</span>
                    </button>

                </div>
             </div>
        )}

        {/* --- CREATE / EDIT VIEW --- */}
        {(view === 'CREATE' || view === 'EDIT') && (
            <div className="flex-1 flex flex-col bg-slate-900">
                <div className="flex-1 overflow-y-auto p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Designation (Name)</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. React Architect"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 font-mono focus:border-cyan-500 outline-none transition-colors"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Function (Role)</label>
                                <input 
                                    type="text" 
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                    placeholder="e.g. Senior Code Refactorer"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 font-mono focus:border-cyan-500 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Vocal Tone</label>
                                <input 
                                    type="text" 
                                    value={formData.tone}
                                    onChange={e => setFormData({...formData, tone: e.target.value})}
                                    placeholder="e.g. Brutally Honest, Precise"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 font-mono focus:border-cyan-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Interface Color</label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setFormData({...formData, avatarColor: c})}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${formData.avatarColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-slate-950/50 p-4 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style={{ backgroundColor: formData.avatarColor }}>
                                        {formData.name.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-200">{formData.name || 'Agent Name'}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{formData.role || 'Role Undefined'}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 italic">
                                    "This is a preview of how the agent will appear in the chat interface."
                                </div>
                            </div>
                        </div>
                     </div>

                     <div className="border-t border-slate-800 pt-6">
                        <label className="block text-[10px] font-bold text-cyan-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Core Directives (System Prompt)
                        </label>
                        <textarea 
                            value={formData.systemPrompt}
                            onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                            placeholder="You are an expert system designed to..."
                            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono focus:border-cyan-500 outline-none transition-colors resize-none leading-relaxed"
                        />
                         <p className="text-[10px] text-slate-500 mt-2">
                             These instructions will override the default model behavior when this agent is active.
                         </p>
                     </div>
                </div>
                
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
                    <button 
                        onClick={() => setView('GRID')}
                        className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white transition-colors"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!formData.name || !formData.systemPrompt}
                        className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        COMPILE IDENTITY
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default PersonaConfigurator;
