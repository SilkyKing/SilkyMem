import React, { useState } from 'react';
import { PersonaProfile } from '../types';
import { DEFAULT_PERSONAS } from '../constants';

interface PersonaConfiguratorProps {
  currentPersona: PersonaProfile;
  onSelect: (persona: PersonaProfile) => void;
  onClose: () => void;
}

const PersonaConfigurator: React.FC<PersonaConfiguratorProps> = ({ currentPersona, onSelect, onClose }) => {
  const [customMode, setCustomMode] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaProfile>(currentPersona);

  const handlePresetSelect = (persona: PersonaProfile) => {
    setEditingPersona(persona);
    onSelect(persona);
  };

  const handleSaveCustom = () => {
    onSelect(editingPersona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-[600px] max-w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wider font-mono">AGENT PROTOCOL CONFIGURATION</h2>
              <p className="text-[10px] text-slate-500 uppercase">Define the Gatekeeper Persona</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Preset Selection */}
          <div>
            <h3 className="text-xs font-mono text-cyan-500 mb-3 uppercase">Select Protocol Template</h3>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p)}
                  className={`
                    p-3 rounded border text-left transition-all group relative overflow-hidden
                    ${editingPersona.id === p.id 
                      ? 'bg-slate-800 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' 
                      : 'bg-slate-900 border-slate-800 hover:border-slate-600'}
                  `}
                >
                   <div className="absolute top-0 left-0 w-1 h-full transition-colors" style={{ backgroundColor: editingPersona.id === p.id ? p.avatarColor : 'transparent' }}></div>
                   <div className="pl-3">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-sm font-bold text-slate-200 group-hover:text-white">{p.name}</span>
                       {editingPersona.id === p.id && <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>}
                     </div>
                     <p className="text-[10px] text-slate-500 font-mono uppercase">{p.role}</p>
                   </div>
                </button>
              ))}
            </div>
          </div>

          {/* Customization Panel */}
          <div className="border-t border-slate-800 pt-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-mono text-cyan-500 uppercase">Identity Directives</h3>
                <button 
                  onClick={() => setCustomMode(!customMode)}
                  className="text-[10px] text-slate-500 hover:text-cyan-400 underline font-mono"
                >
                  {customMode ? 'RESET TO DEFAULT' : 'OVERRIDE PROTOCOLS'}
                </button>
             </div>

             <div className={`space-y-4 ${!customMode ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1 uppercase">Agent Name</label>
                        <input 
                            type="text" 
                            value={editingPersona.name}
                            onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:border-cyan-500 outline-none"
                        />
                    </div>
                     <div>
                        <label className="block text-[10px] text-slate-500 mb-1 uppercase">Primary Role</label>
                        <input 
                            type="text" 
                            value={editingPersona.role}
                            onChange={e => setEditingPersona({...editingPersona, role: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:border-cyan-500 outline-none"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase">Tone / Personality</label>
                    <input 
                        type="text" 
                        value={editingPersona.tone}
                        onChange={e => setEditingPersona({...editingPersona, tone: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:border-cyan-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-[10px] text-slate-500 mb-1 uppercase">System Prompt (Gatekeeper Logic)</label>
                    <textarea 
                        value={editingPersona.systemPrompt}
                        onChange={e => setEditingPersona({...editingPersona, systemPrompt: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono h-24 resize-none focus:border-cyan-500 outline-none leading-relaxed"
                    />
                </div>
             </div>
          </div>

        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
                CANCEL
            </button>
            <button 
                onClick={handleSaveCustom}
                className="px-6 py-2 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-400 hover:text-white text-xs rounded border border-cyan-800 transition-all font-bold tracking-wider"
            >
                INITIALIZE PERSONA
            </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaConfigurator;
