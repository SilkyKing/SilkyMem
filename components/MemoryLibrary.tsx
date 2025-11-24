import React, { useState, useEffect, useMemo } from 'react';
import { MemoryNode, Emotion } from '../types';
import { vault } from '../services/vaultService';
import MagicDropZone from './MagicDropZone';

interface MemoryLibraryProps {
  memories: MemoryNode[];
}

interface NetworkNode {
  id: string;
  label: string;
  type: 'CATEGORY' | 'MEMORY';
  count?: number;
  data?: MemoryNode;
  x?: number;
  y?: number;
}

const MemoryLibrary: React.FC<MemoryLibraryProps> = ({ memories }) => {
  const [viewMode, setViewMode] = useState<'GRAPH' | 'TIMELINE'>('GRAPH');
  const [path, setPath] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropZone, setShowDropZone] = useState(false);
  const [shreddingId, setShreddingId] = useState<string | null>(null);

  const filteredMemories = useMemo(() => {
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return memories.filter(mem => 
            mem.content.toLowerCase().includes(q) || 
            mem.tags.some(t => t.toLowerCase().includes(q))
        );
    }

    if (path.length === 0) return memories;
    return memories.filter(mem => 
      path.every(tag => mem.tags.includes(tag))
    );
  }, [memories, path, searchQuery]);

  const nodes: NetworkNode[] = useMemo(() => {
    if (searchQuery.trim()) {
        return filteredMemories.slice(0, 12).map(mem => ({
            id: mem.id,
            label: mem.content.substring(0, 15) + '...',
            type: 'MEMORY',
            data: mem
        }));
    }

    if (filteredMemories.length <= 5 && path.length > 0) {
      return filteredMemories.map(mem => ({
        id: mem.id,
        label: mem.content.substring(0, 20) + '...',
        type: 'MEMORY',
        data: mem
      }));
    }

    const tagCounts: Record<string, number> = {};
    filteredMemories.forEach(mem => {
      mem.tags.forEach(tag => {
        if (!path.includes(tag)) { 
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tag, count]) => ({
        id: tag,
        label: tag,
        type: 'CATEGORY',
        count
      }));

  }, [filteredMemories, path, searchQuery]);

  const layoutNodes = useMemo(() => {
    const radius = 35; // percent
    const center = { x: 50, y: 50 };
    
    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI - (Math.PI / 2);
      return {
        ...node,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });
  }, [nodes]);

  const timelineData = useMemo(() => {
      const sorted = [...filteredMemories].sort((a, b) => b.timestamp - a.timestamp);
      const groups: Record<string, MemoryNode[]> = {};
      
      const now = new Date();
      sorted.forEach(mem => {
          const d = new Date(mem.timestamp);
          let key = d.toLocaleDateString();
          
          if (d.toDateString() === now.toDateString()) key = 'Today';
          else if (d.getDate() === now.getDate() - 1 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) key = 'Yesterday';
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(mem);
      });
      
      return Object.entries(groups);
  }, [filteredMemories]);

  const handleNodeClick = (node: NetworkNode) => {
    if (node.type === 'CATEGORY') {
      setPath(prev => [...prev, node.id]);
      setSelectedNodeId(null);
      setSearchQuery('');
    } else {
      setSelectedNodeId(node.id);
    }
  };

  const handleBack = () => {
    if (searchQuery) {
        setSearchQuery('');
        return;
    }
    setPath(prev => prev.slice(0, -1));
    setSelectedNodeId(null);
  };

  const handlePurge = (id: string) => {
      setShreddingId(id);
      setTimeout(() => {
          vault.purgeMemory(id);
          setSelectedNodeId(null);
          setShreddingId(null);
      }, 1000);
  };

  const selectedMemory = selectedNodeId 
    ? memories.find(m => m.id === selectedNodeId) 
    : null;

  const centerLabel = useMemo(() => {
      if (searchQuery) return `"${searchQuery}"`;
      if (path.length > 0) return path[path.length - 1].toUpperCase();
      return 'ALL MEMS';
  }, [path, searchQuery]);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden text-slate-200">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 z-20 flex flex-col md:flex-row justify-between items-start md:items-center pointer-events-none gap-4">
        <div>
            <h2 className="text-2xl font-mono font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-3">
                VAULT EXPLORER
            </h2>
            <div className="flex gap-2 mt-2 pointer-events-auto flex-wrap items-center">
                {/* View Toggle */}
                <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 backdrop-blur-sm mr-2">
                    <button 
                        onClick={() => setViewMode('GRAPH')}
                        className={`text-[10px] px-3 py-1 rounded-md transition-all ${viewMode === 'GRAPH' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        GRAPH
                    </button>
                    <button 
                        onClick={() => setViewMode('TIMELINE')}
                        className={`text-[10px] px-3 py-1 rounded-md transition-all ${viewMode === 'TIMELINE' ? 'bg-white/10 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        TIMELINE
                    </button>
                </div>

                <button 
                    onClick={() => { setPath([]); setSearchQuery(''); }}
                    className={`text-xs font-mono px-2 py-1 rounded-md border transition-all ${path.length === 0 && !searchQuery ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'border-white/10 bg-black/20 text-slate-500 hover:text-white'}`}
                >
                    ROOT
                </button>
                {path.map((tag, idx) => (
                    <React.Fragment key={tag}>
                        <span className="text-slate-600 text-xs flex items-center">/</span>
                        <button 
                            onClick={() => setPath(path.slice(0, idx + 1))}
                            className="text-xs font-mono px-2 py-1 rounded-md border border-white/10 bg-black/20 text-cyan-400 hover:bg-white/5 transition-colors"
                        >
                            {tag.toUpperCase()}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>

        {/* Right Header Controls */}
        <div className="pointer-events-auto flex items-center gap-3">
            <div className="relative group w-full md:w-64">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedNodeId(null); }}
                    placeholder="Search Vault..."
                    className="block w-full pl-4 pr-3 py-2 border border-white/10 rounded-xl leading-5 bg-black/40 text-slate-200 placeholder-slate-600 focus:outline-none focus:bg-black/60 focus:border-cyan-500/50 backdrop-blur-sm transition-all text-sm font-mono"
                />
            </div>
            
            <button
                onClick={() => setShowDropZone(!showDropZone)}
                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${showDropZone ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'}`}
                title="Open Magic Box Ingest"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        
        {/* Magic Drop Zone Overlay */}
        {showDropZone && (
             <div className="absolute top-28 z-30 animate-in slide-in-from-top-4 w-full max-w-lg pointer-events-auto">
                <MagicDropZone />
             </div>
        )}

        {/* --- VIEW MODE: GRAPH --- */}
        {viewMode === 'GRAPH' && (
            <div className={`relative w-[600px] h-[600px] animate-fade-in ${showDropZone ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
                
                {/* Center Node */}
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-[0_0_60px_rgba(6,182,212,0.15)] flex items-center justify-center z-10 transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95 group"
                    onClick={handleBack}
                >
                    <div className="text-center px-2">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Context</div>
                        <div className="text-sm font-bold text-white font-mono truncate max-w-[100px] mx-auto">
                            {centerLabel}
                        </div>
                        <div className="text-[10px] text-cyan-500 mt-1">{filteredMemories.length} Items</div>
                    </div>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {layoutNodes.map(node => (
                        <line 
                            key={`line-${node.id}`}
                            x1="50%" 
                            y1="50%" 
                            x2={`${node.x}%`} 
                            y2={`${node.y}%`} 
                            stroke="#ffffff" 
                            strokeWidth="1" 
                            strokeOpacity="0.1"
                        />
                    ))}
                </svg>

                {layoutNodes.map((node) => (
                    <div
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className={`
                            absolute w-20 h-20 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-500 group backdrop-blur-md
                            hover:scale-110 hover:z-20 hover:shadow-2xl active:scale-95
                            ${node.type === 'CATEGORY' 
                                ? 'bg-slate-900/60 border-cyan-500/30 text-cyan-100 hover:border-cyan-400' 
                                : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-100 hover:border-emerald-400'}
                        `}
                        style={{
                            top: `${node.y}%`,
                            left: `${node.x}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div className="text-[9px] font-bold font-mono uppercase tracking-wider truncate w-full text-center px-1 leading-tight">
                            {node.label}
                        </div>
                        {node.count !== undefined && (
                            <div className="text-[8px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded mt-1.5">
                                {node.count}
                            </div>
                        )}
                        {node.type === 'MEMORY' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shadow-[0_0_8px_#10b981]"></div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW MODE: TIMELINE --- */}
        {viewMode === 'TIMELINE' && (
            <div className={`w-full h-full pt-32 px-12 pb-12 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 ${showDropZone ? 'opacity-20' : 'opacity-100'}`}>
                <div className="max-w-3xl mx-auto space-y-8">
                    {timelineData.map(([dateGroup, items]) => (
                        <div key={dateGroup} className="relative pl-8 border-l border-white/10">
                            <span className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono ring-4 ring-black">
                                ●
                            </span>
                            <h3 className="text-sm font-bold text-cyan-500 mb-6 font-mono uppercase tracking-wider pl-2">{dateGroup}</h3>
                            <div className="space-y-3">
                                {items.map(mem => (
                                    <div 
                                        key={mem.id} 
                                        onClick={() => setSelectedNodeId(mem.id)}
                                        className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 rounded-xl p-5 cursor-pointer transition-all active:scale-[0.99] group backdrop-blur-sm"
                                    >
                                        <div className="flex items-start gap-5">
                                            <div className="mt-1 p-2 rounded-lg bg-black/20">
                                                {mem.origin === 'IMPORTED_FILE' ? (
                                                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                ) : mem.origin === 'USER_INPUT' ? (
                                                     <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-200 line-clamp-2 group-hover:text-white transition-colors leading-relaxed font-light">{mem.content}</p>
                                                <div className="flex gap-2 mt-3 items-center">
                                                    {mem.tags.slice(0, 3).map(t => (
                                                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">#{t}</span>
                                                    ))}
                                                    <span className="text-[10px] text-slate-600 ml-auto font-mono">
                                                        {new Date(mem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {nodes.length === 0 && !showDropZone && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 text-slate-600 font-mono text-xs text-center">
                {searchQuery ? '[NO SIGNAL]' : '[ END OF NEURAL PATH ]'}
             </div>
        )}
      </div>

      {/* Side Panel: Memory Detail */}
      {selectedMemory && (
        <div className={`absolute right-0 top-0 bottom-0 w-96 bg-slate-950/90 backdrop-blur-xl border-l border-white/10 p-8 shadow-2xl transform transition-transform z-30 overflow-y-auto ${shreddingId === selectedMemory.id ? 'opacity-0 scale-95 duration-700' : ''}`}>
            <button 
                onClick={() => setSelectedNodeId(null)}
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="mt-8">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-900/20 border border-emerald-500/20 px-2 py-1 rounded">
                        MEMORY NODE
                    </span>
                    <button 
                        onClick={() => handlePurge(selectedMemory.id)}
                        className="flex items-center gap-1.5 text-[9px] font-mono text-red-500 bg-red-900/10 border border-red-500/20 px-2 py-1 rounded hover:bg-red-900/30 transition-colors group"
                        title="Permanently Delete and Remove Vector"
                    >
                        <svg className="w-3 h-3 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        SHRED
                    </button>
                </div>
                
                <h3 className="text-lg font-medium text-slate-100 leading-relaxed">
                    {selectedMemory.content}
                </h3>
                
                <div className="mt-8 space-y-6">
                    <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Metadata</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="text-[9px] text-slate-500 mb-1">CREATED</div>
                                <div className="text-xs text-slate-300 font-mono">{new Date(selectedMemory.timestamp).toLocaleDateString()}</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="text-[9px] text-slate-500 mb-1">SOURCE</div>
                                <div className="text-xs text-slate-300 font-mono">{selectedMemory.origin}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Tags</div>
                        <div className="flex flex-wrap gap-2">
                            {selectedMemory.tags.map(t => (
                                <span key={t} className="text-xs bg-cyan-900/10 text-cyan-400 px-2.5 py-1 rounded-md border border-cyan-500/20">#{t}</span>
                            ))}
                        </div>
                    </div>

                     <div>
                        <div className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-widest">Lucidity</div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" 
                                style={{ width: `${selectedMemory.decayFactor * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="p-4 bg-black/40 rounded-lg border border-white/5 font-mono text-[9px] text-slate-500 break-all">
                        ID: {selectedMemory.id}<br/>
                        HASH: {selectedMemory.semanticHash}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MemoryLibrary;