import React, { useState, useEffect, useMemo } from 'react';
import { MemoryNode, ChatMessage } from '../types';
import { vault } from '../services/vaultService';

interface ContextRailProps {
  liveInput: string;
  lastModelMessage: ChatMessage | null;
  activeMemoryIds: string[]; // For visualizing usage
  pinnedMemoryIds: string[];
  onPinMemory: (id: string) => void;
}

interface Artifact {
    id: string;
    type: 'CODE' | 'DATA' | 'SUMMARY';
    title: string;
    content: string;
    language?: string;
}

const ContextRail: React.FC<ContextRailProps> = ({ liveInput, lastModelMessage, activeMemoryIds, pinnedMemoryIds, onPinMemory }) => {
  const [activeTab, setActiveTab] = useState<'RELEVANCE' | 'ARTIFACTS'>('RELEVANCE');
  const [searchResults, setSearchResults] = useState<MemoryNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useEffect(() => {
      const handler = setTimeout(async () => {
          if (liveInput.trim().length > 2) {
              setIsSearching(true);
              const results = await vault.semanticSearch(liveInput, 5);
              setSearchResults(results);
              setIsSearching(false);
          } else {
              setSearchResults([]);
          }
      }, 500);

      return () => clearTimeout(handler);
  }, [liveInput]);

  useEffect(() => {
      if (lastModelMessage && lastModelMessage.role === 'model') {
          const extracted: Artifact[] = [];
          const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
          let match;
          let index = 0;
          
          while ((match = codeRegex.exec(lastModelMessage.content)) !== null) {
              extracted.push({
                  id: `art-${lastModelMessage.id}-${index++}`,
                  type: 'CODE',
                  title: `${match[1] || 'Script'} Snippet`,
                  language: match[1],
                  content: match[2].trim()
              });
          }

          if (lastModelMessage.content.includes(',') && lastModelMessage.content.includes('\n') && !extracted.length) {
              const lines = lastModelMessage.content.split('\n');
              if (lines.length > 2 && lines[0].includes(',')) {
                   extracted.push({
                      id: `art-${lastModelMessage.id}-csv`,
                      type: 'DATA',
                      title: 'Structured Data',
                      content: lastModelMessage.content
                  });
              }
          }

          if (extracted.length > 0) {
              setArtifacts(extracted);
              setActiveTab('ARTIFACTS'); 
          }
      }
  }, [lastModelMessage]);

  const combinedResults = useMemo(() => {
      const pinnedNodes = vault.getMemoriesByIds(pinnedMemoryIds);
      const searchFiltered = searchResults.filter(s => !pinnedMemoryIds.includes(s.id));
      return { pinnedNodes, searchFiltered };
  }, [searchResults, pinnedMemoryIds]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden font-sans text-slate-300">
      
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Context Rail
          </h3>
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
             <button 
                onClick={() => setActiveTab('RELEVANCE')}
                className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${activeTab === 'RELEVANCE' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
                 LIVE
             </button>
             <button 
                onClick={() => setActiveTab('ARTIFACTS')}
                className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${activeTab === 'ARTIFACTS' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
                 WIDGETS
             </button>
          </div>
      </div>

      {/* RELEVANCE TAB */}
      {activeTab === 'RELEVANCE' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2">
                  <span>{isSearching ? 'SCANNING...' : 'SYSTEM READY'}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSearching ? 'bg-cyan-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              </div>

              {/* Pinned Section */}
              {combinedResults.pinnedNodes.length > 0 && (
                  <div className="space-y-2">
                      <div className="text-[9px] uppercase text-cyan-500 font-bold tracking-wider flex items-center gap-2">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                          Pinned Context
                      </div>
                      {combinedResults.pinnedNodes.map(node => (
                          <div key={node.id} className="bg-cyan-900/10 border border-cyan-500/30 rounded-xl p-3 relative group transition-all hover:bg-cyan-900/20 backdrop-blur-sm">
                              <button 
                                onClick={() => onPinMemory(node.id)}
                                className="absolute top-2 right-2 text-cyan-400 hover:text-white transition-colors p-1"
                                title="Unpin"
                              >
                                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                              </button>
                              <div className="text-[10px] text-cyan-400 font-mono mb-1.5">{new Date(node.timestamp).toLocaleDateString()}</div>
                              <div className="text-xs text-slate-200 line-clamp-3 leading-relaxed">{node.content}</div>
                          </div>
                      ))}
                  </div>
              )}

              {/* Search Results */}
              <div className="space-y-2">
                   <div className="text-[9px] uppercase text-slate-600 font-bold tracking-wider">
                       {liveInput ? 'Relevance Matches' : 'Passive Monitoring'}
                   </div>
                   
                   {combinedResults.searchFiltered.map(node => (
                      <div key={node.id} className="bg-white/5 border border-white/5 rounded-xl p-3 relative group transition-all hover:bg-white/10 hover:border-white/10 active:scale-[0.99] backdrop-blur-sm">
                          <button 
                             onClick={() => onPinMemory(node.id)}
                             className="absolute top-2 right-2 text-slate-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                             title="Pin to Context"
                          >
                               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                          </button>
                          <div className="flex items-center gap-2 mb-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${activeMemoryIds.includes(node.id) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                              <span className="text-[10px] text-slate-500 font-mono">#{node.tags[0] || 'memory'}</span>
                          </div>
                          <div className="text-xs text-slate-400 line-clamp-3 group-hover:text-slate-200 transition-colors leading-relaxed">{node.content}</div>
                      </div>
                   ))}

                   {combinedResults.searchFiltered.length === 0 && !isSearching && (
                       <div className="text-center py-12 opacity-30">
                           <div className="w-12 h-12 border border-slate-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                               <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                           </div>
                           <p className="text-[10px] font-mono">AWAITING SIGNAL</p>
                       </div>
                   )}
              </div>
          </div>
      )}

      {/* ARTIFACTS TAB */}
      {activeTab === 'ARTIFACTS' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {artifacts.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                      <p className="text-[10px] font-mono">NO ARTIFACTS DETECTED</p>
                  </div>
              )}

              {artifacts.map(art => (
                  <div key={art.id} className="bg-black/30 border border-white/10 rounded-xl overflow-hidden shadow-lg group backdrop-blur-md">
                      <div className="bg-white/5 px-3 py-2 flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-2">
                              {art.type === 'CODE' && <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>}
                              {art.type === 'DATA' && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
                              <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">{art.title}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">{art.language || 'RAW'}</span>
                      </div>
                      <div className="p-3">
                          <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                              {art.content.substring(0, 150)}{art.content.length > 150 ? '...' : ''}
                          </pre>
                      </div>
                      <div className="px-3 py-2 border-t border-white/5 flex justify-end bg-black/20">
                          <button className="text-[9px] text-cyan-400 hover:text-white flex items-center gap-1 font-bold">
                              COPY WIDGET
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default ContextRail;