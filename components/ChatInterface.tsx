import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ApiConfig, PersonaProfile, ApiProviderType, PromptInjectionStrategy } from '../types';
import { vault } from '../services/vaultService';
import { generateResponse } from '../services/geminiService';

interface ChatInterfaceProps {
  onMemoriesActivated: (ids: string[]) => void;
  onNewMemory: () => void;
  onOpenLibrary: () => void;
  onInputChange: (text: string) => void;
  onModelOutput: (msg: ChatMessage) => void;
  pinnedMemoryIds: string[];
  activePersona: PersonaProfile;
}

// Reusable Core Loader Component
const NexusCoreLoader = () => (
    <div className="relative w-4 h-4 flex items-center justify-center">
        <div className="absolute w-full h-full bg-cyan-core rounded-full opacity-75 animate-ping"></div>
        <div className="relative w-2 h-2 bg-cyan-core rounded-full shadow-[0_0_8px_#24E0E8]"></div>
    </div>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    onMemoriesActivated, 
    onNewMemory, 
    onOpenLibrary, 
    onInputChange,
    onModelOutput,
    pinnedMemoryIds,
    activePersona 
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'system',
      content: `Nexus online. ${activePersona.name} ready for recall.`,
      timestamp: Date.now(),
      isEncrypted: false
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>(''); 
  const [selectedApiId, setSelectedApiId] = useState<string>('AUTO');
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);

  // Prompt Engineering State
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [injectionStrategy, setInjectionStrategy] = useState<PromptInjectionStrategy>('PREPEND');

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PARSING' | 'COMPLETE'>('IDLE');

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentStep]);

  useEffect(() => {
      const configs = vault.getApiConfigs();
      setApiConfigs(configs);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      setInput(newVal);
      onInputChange(newVal);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       await handleFileIngest(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileIngest = async (file: File) => {
      setDragActive(true);
      setUploadStatus('PARSING');
      
      try {
          await vault.ingestFile(file);
          setUploadStatus('COMPLETE');
          onNewMemory();
          
          setHistory(prev => [...prev, {
              id: Date.now().toString(),
              role: 'system',
              content: `SECURE INGEST: ${file.name} successfully encrypted and vectorized.`,
              timestamp: Date.now(),
              isEncrypted: true
          }]);

          setTimeout(() => {
              setDragActive(false);
              setUploadStatus('IDLE');
          }, 1500);

      } catch (err) {
          console.error(err);
          setDragActive(false);
          setUploadStatus('IDLE');
      }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      isEncrypted: false
    };

    setHistory(prev => [...prev, userMsg]);
    setInput('');
    onInputChange(''); 
    setIsProcessing(true);

    try {
        // --- RAG PIPELINE STEP 1: RETRIEVAL ---
        setCurrentStep('Vector Scan: Retrieving Context...');
        let contextNodes = [];

        if (pinnedMemoryIds.length > 0) {
            setCurrentStep(`Locked: ${pinnedMemoryIds.length} pinned nodes active.`);
            contextNodes = vault.getMemoriesByIds(pinnedMemoryIds);
        } else {
            // Query the local VaultKernel
            contextNodes = await vault.semanticSearch(userMsg.content, 4);
        }
        
        onMemoriesActivated(contextNodes.map(n => n.id));

        // --- RAG PIPELINE STEP 2: CONTEXT INJECTION ---
        setCurrentStep(`Synthesizing ${contextNodes.length} memory vectors...`);
        // Artificial delay to show the "Thinking" UI state
        await new Promise(r => setTimeout(r, 800)); 

        let configToUse: ApiConfig | undefined | 'AUTO';
        if (selectedApiId === 'AUTO') {
            configToUse = 'AUTO';
            setCurrentStep('Switchboard: Routing Protocol...');
            await new Promise(r => setTimeout(r, 400)); 
        } else {
            configToUse = apiConfigs.find(c => c.id === selectedApiId);
        }
        
        const contextStrings = contextNodes.map(n => `[MEMORY ID:${n.id.split('-')[1]} | T:${new Date(n.timestamp).toLocaleDateString()}] ${n.content}`);
        
        // --- RAG PIPELINE STEP 3: GENERATION ---
        const { text: responseText, metrics } = await generateResponse(
            userMsg.content, 
            contextStrings, 
            configToUse, 
            activePersona,
            { temperature, injectionStrategy } // Pass advanced settings
        );

        // --- RAG PIPELINE STEP 4: INGESTION (The Feedback Loop) ---
        setCurrentStep('Indexing Conversation...');
        
        // We save the PAIR (Q + A) so the model remembers this interaction in the future
        const memoryContent = `USER: ${userMsg.content}\nNEXUS: ${responseText}`;
        await vault.saveMemory(memoryContent, 'SYSTEM_INFERENCE' as any);
        onNewMemory();

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: Date.now(),
            relatedMemories: contextNodes.map(n => n.id),
            isEncrypted: true,
            metrics: metrics
        };

        setHistory(prev => [...prev, modelMsg]);
        onModelOutput(modelMsg);

    } catch (error: any) {
        console.error("Pipeline Error:", error);
        setHistory(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            content: `SYSTEM ERROR: ${error.message || "Operation Failed"}`,
            timestamp: Date.now(),
            isEncrypted: false
        }]);
    } finally {
        setIsProcessing(false);
        setCurrentStep('');
        onMemoriesActivated([]); 
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getProviderColor = (provider?: ApiProviderType) => {
      switch(provider) {
          case 'OPENAI': return 'border-emerald-500 text-emerald-500'; 
          case 'ANTHROPIC': return 'border-orange-500 text-orange-500'; 
          case 'GROQ': return 'border-blue-500 text-blue-500'; 
          case 'MISTRAL': return 'border-yellow-500 text-yellow-500'; 
          case 'XAI': return 'border-slate-100 text-slate-100'; 
          default: return 'border-cyan-core text-cyan-core';
      }
  };

  const getProviderName = (provider?: ApiProviderType) => {
    switch(provider) {
        case 'OPENAI': return 'OpenAI';
        case 'ANTHROPIC': return 'Claude';
        case 'GROQ': return 'Meta Llama';
        case 'MISTRAL': return 'Mistral';
        case 'XAI': return 'Grok';
        default: return 'Nexus';
    }
  };

  // Helper to render message content with floating artifacts
  const renderMessageContent = (content: string) => {
      const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = codeBlockRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
              parts.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap">{content.substring(lastIndex, match.index)}</span>);
          }
          parts.push(
              <div key={`code-${match.index}`} className="my-4 rounded-lg bg-black/40 border border-white/10 overflow-hidden shadow-lg backdrop-blur-sm group hover:border-white/20 transition-colors">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{match[1] || 'CODE'}</span>
                      <button className="text-[10px] text-slate-500 hover:text-white transition-colors">COPY</button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-300">
                      {match[2].trim()}
                  </pre>
              </div>
          );
          lastIndex = match.index + match[0].length;
      }
      if (lastIndex < content.length) {
          parts.push(<span key={`text-${lastIndex}`} className="whitespace-pre-wrap">{content.substring(lastIndex)}</span>);
      }
      return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
  };

  return (
    <div 
        className="flex flex-col h-full relative overflow-hidden"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
    >
      {/* Global Drop Zone Overlay */}
      {dragActive && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center border-4 border-cyan-core/30 border-dashed animate-in fade-in duration-200 pointer-events-none">
              <div className="bg-slate-900 p-8 rounded-2xl border border-cyan-core/50 shadow-2xl flex flex-col items-center text-center max-w-sm">
                  {uploadStatus === 'IDLE' && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-cyan-900/30 flex items-center justify-center mb-4 text-cyan-core animate-bounce">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Add to Secure Vault</h3>
                        <p className="text-sm text-slate-400">Processed locally. Encryption Active.</p>
                      </>
                  )}
                  {uploadStatus === 'PARSING' && (
                      <>
                         <div className="w-16 h-16 rounded-full border-4 border-cyan-900 border-t-cyan-core animate-spin mb-4"></div>
                         <h3 className="text-lg font-bold text-cyan-core mb-1">Parsing...</h3>
                         <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                             <div className="h-full bg-cyan-core animate-[scan_1s_infinite] w-full origin-left"></div>
                         </div>
                      </>
                  )}
                  {uploadStatus === 'COMPLETE' && (
                      <>
                        <div className="w-16 h-16 rounded-full bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-400">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">Stored</h3>
                        <p className="text-sm text-emerald-400">Context Vectorized.</p>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.02] backdrop-blur-sm z-30 relative">
        <div className="flex items-center gap-3">
            <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-slate-400 leading-none tracking-widest uppercase">Encrypted Stream</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5" style={{ color: activePersona.avatarColor }}>
                {activePersona.name}
              </span>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={onOpenLibrary}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group"
            >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-core" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-cyan-core uppercase">Map</span>
            </button>

            {/* Advanced Toggle */}
            <button 
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 group ${isAdvancedMode ? 'bg-cyan-900/20 border-cyan-core/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
                <svg className={`w-4 h-4 ${isAdvancedMode ? 'text-cyan-core' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className={`text-[10px] font-mono font-bold uppercase ${isAdvancedMode ? 'text-cyan-core' : 'text-slate-400'}`}>
                    Control
                </span>
            </button>

            <div className="h-4 w-[1px] bg-white/10"></div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono hidden md:inline">ROUTER:</span>
                <select 
                    value={selectedApiId}
                    onChange={(e) => setSelectedApiId(e.target.value)}
                    className="bg-black/20 border border-white/10 text-xs text-cyan-core px-2 py-1 rounded font-mono outline-none focus:border-cyan-core/50 max-w-[150px] appearance-none"
                >
                    <option value="AUTO">Switchboard (Auto)</option>
                    {apiConfigs.map(api => (
                        <option key={api.id} value={api.id}>
                            {api.provider === 'GROQ' ? 'Meta Llama' : api.provider === 'XAI' ? 'Grok' : api.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        {/* Advanced Controls Deck (Sliding Panel) */}
        <div className={`absolute top-full right-0 left-0 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${isAdvancedMode ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="container mx-auto max-w-4xl p-6 grid grid-cols-2 gap-8">
                
                {/* Temperature Slider */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-3 h-3 text-cyan-core" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Temperature (Creativity)
                        </label>
                        <span className="text-xs font-mono text-cyan-core bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-core/20">{temperature.toFixed(1)}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-core hover:accent-cyan-400"
                    />
                    <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1">
                        <span>PRECISE</span>
                        <span>BALANCED</span>
                        <span>CREATIVE</span>
                    </div>
                </div>

                {/* Strategy Dropdown */}
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        Context Injection Strategy
                    </label>
                    <div className="relative">
                        <select 
                            value={injectionStrategy}
                            onChange={(e) => setInjectionStrategy(e.target.value as PromptInjectionStrategy)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 font-mono focus:border-cyan-core/50 outline-none appearance-none"
                        >
                            <option value="PREPEND">PREPEND (Standard)</option>
                            <option value="APPEND">APPEND (Recency Bias)</option>
                            <option value="INTERLEAVE">INTERLEAVE (Deep Integrate)</option>
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-2 leading-relaxed">
                        {injectionStrategy === 'PREPEND' && "Injects retrieved context BEFORE the user query. Best for general Q&A."}
                        {injectionStrategy === 'APPEND' && "Injects context AFTER the query. Forces the model to consider the prompt first."}
                        {injectionStrategy === 'INTERLEAVE' && "Splits context chunks around the query. High token usage, high coherence."}
                    </div>
                </div>

            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
        {history.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            
            {msg.role === 'user' ? (
                // USER BUBBLE
                <div className="max-w-[70%] bg-white/10 backdrop-blur-md rounded-2xl rounded-tr-sm p-4 text-slate-100 shadow-lg border border-white/5">
                    <div className="text-sm font-light leading-relaxed font-sans">{msg.content}</div>
                </div>
            ) : msg.role === 'system' ? (
                // SYSTEM MESSAGE
                <div className="w-full flex justify-center my-2">
                    <div className={`text-[10px] font-mono px-3 py-1 rounded-full border flex items-center gap-2 ${msg.content.includes('ERROR') ? 'bg-red-900/20 border-red-500/20 text-red-400' : 'bg-black/20 border-white/5 text-slate-500'}`}>
                        {msg.isEncrypted && <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                        {msg.content}
                    </div>
                </div>
            ) : (
                // MODEL BUBBLE (Liquid Design)
                <div className="max-w-[85%] relative pl-4 group">
                    {/* Indicator Line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[2px] rounded-full ${getProviderColor(msg.metrics?.provider).split(' ')[0]} bg-current opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                    
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1.5 opacity-60">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${getProviderColor(msg.metrics?.provider).split(' ')[1]}`}>
                           {activePersona.name} • {getProviderName(msg.metrics?.provider)}
                        </span>
                        
                        {/* Routing Badges */}
                        {msg.metrics?.routingMode === 'LIGHTNING' && (
                           <span className="text-[9px] text-yellow-400 bg-yellow-400/10 px-1 rounded flex items-center gap-1 font-bold">⚡ FLASH</span>
                        )}
                        {msg.metrics?.routingMode === 'DEEP_THOUGHT' && (
                           <span className="text-[9px] text-purple-400 bg-purple-400/10 px-1 rounded flex items-center gap-1 font-bold">🧠 DEEP</span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="text-sm text-slate-200 leading-relaxed font-sans">
                        {renderMessageContent(msg.content)}
                    </div>

                    {/* Footer Sources */}
                    {msg.relatedMemories && msg.relatedMemories.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            {msg.relatedMemories.map((id) => (
                                <span key={id} className="text-[9px] font-mono text-cyan-core bg-cyan-900/20 px-1.5 py-0.5 rounded border border-cyan-core/20 whitespace-nowrap">
                                    REF:{id.split('-')[1]}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}
        
        {isProcessing && (
            <div className="flex justify-start animate-fade-in pl-4 border-l-2 border-slate-700">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500 animate-pulse">{currentStep}</span>
                    {/* REPLACED: Standard dots with Nexus Core Loader */}
                    <NexusCoreLoader />
                </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/[0.02] backdrop-blur-md border-t border-white/5 relative z-20">
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Recall a memory or draft a new idea..."
                className="relative w-full bg-black/40 text-slate-200 text-sm rounded-xl border border-white/10 p-4 pl-12 pr-14 focus:outline-none focus:border-white/20 focus:bg-black/60 transition-all resize-none h-20 font-sans placeholder-slate-600 shadow-inner"
            />
            
            {/* Attachment Icon */}
            <div className="absolute left-3 top-3">
                <button 
                    className="text-slate-600 hover:text-cyan-core transition-colors p-1.5 rounded-lg hover:bg-white/5 active:scale-95"
                    title="Attach File"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileIngest(e.target.files[0])}
                />
            </div>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="absolute right-3 bottom-3 p-2 bg-gradient-to-tr from-cyan-600 to-cyan-500 rounded-lg text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </button>
        </div>
        <div className="text-center mt-3">
            <p className="text-[10px] text-slate-600 font-mono tracking-wide opacity-50">
                SECURE • E2E ENCRYPTED • LOCAL FIRST
            </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;