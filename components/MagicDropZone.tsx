import React, { useState, useCallback, useRef } from 'react';
import { vault } from '../services/vaultService';
import { OriginSource } from '../types';

const MagicDropZone: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [processingState, setProcessingState] = useState<'IDLE' | 'PROCESSING' | 'COMPLETE'>('IDLE');
  const [fileName, setFileName] = useState('');
  const [showUpsell, setShowUpsell] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setProcessingState('PROCESSING');
    setFileName(file.name);
    
    // Simulate File Read & Vectorization Delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock Content Extraction
    const content = `[IMPORTED FILE: ${file.name}] Content content content... Simulated extraction from ${file.type}.`;
    
    // Save to Vault
    // Rule: Files dropped here are "Reference Material", so isUserAuthored = false
    await vault.saveMemory(content, OriginSource.IMPORTED_FILE, false);
    
    setProcessingState('COMPLETE');
    window.dispatchEvent(new Event('vault-update'));
    
    // Show upsell after a brief moment
    setTimeout(() => {
        setShowUpsell(true);
    }, 500);
    
    // Reset after 5 seconds if not interacted with
    setTimeout(() => {
        if (!showUpsell) {
            setProcessingState('IDLE');
            setFileName('');
        }
    }, 5000);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const closeUpsell = () => {
      setShowUpsell(false);
      setProcessingState('IDLE');
  };

  return (
    <div className="relative w-full max-w-lg mx-auto mb-8 font-mono">
      {/* Hidden File Input */}
      <input 
        ref={inputRef}
        type="file" 
        className="hidden" 
        onChange={handleChange}
      />

      {/* Main Drop Area */}
      <div 
        className={`
            relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer group
            ${dragActive 
                ? 'border-cyan-400 bg-cyan-900/20 scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 hover:border-slate-600'}
            ${processingState === 'PROCESSING' ? 'border-none ring-2 ring-cyan-500/50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        {processingState === 'IDLE' && (
            <>
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-300 mb-1 group-hover:text-cyan-300">SECURE DROP ZONE</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Ingest Context Files
                </p>
                <p className="text-[9px] text-slate-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    (PDF, MD, TXT, JSON)
                </p>
            </>
        )}

        {processingState === 'PROCESSING' && (
             <div className="flex flex-col items-center z-10">
                <div className="w-10 h-10 border-2 border-slate-800 border-t-cyan-500 rounded-full animate-spin mb-3"></div>
                <div className="text-xs font-bold text-cyan-400 animate-pulse">PROCESSING: {fileName}</div>
                <div className="text-[9px] text-slate-500 mt-1">Generating Embeddings...</div>
             </div>
        )}

        {processingState === 'COMPLETE' && !showUpsell && (
             <div className="flex flex-col items-center z-10 animate-in fade-in zoom-in">
                <div className="w-10 h-10 rounded-full bg-emerald-900/30 border border-emerald-500/50 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="text-xs font-bold text-emerald-400">INDEXED SECURELY</div>
             </div>
        )}
        
        {/* Background Scan Effect */}
        {processingState === 'PROCESSING' && (
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-scan pointer-events-none"></div>
        )}
      </div>

      {/* Upsell Ramp (Appears below after success) */}
      {showUpsell && (
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-slate-900/95 backdrop-blur rounded-xl border border-cyan-500/30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-2 shadow-2xl z-20">
              <h4 className="text-sm font-bold text-cyan-400 mb-2">Secure Link Established</h4>
              <p className="text-[10px] text-slate-400 mb-4 max-w-[250px] leading-relaxed">
                  Your file was successfully indexed into the vault. Want to automate this for your digital life?
              </p>
              <div className="flex gap-2">
                  <button onClick={closeUpsell} className="px-3 py-1.5 text-[10px] text-slate-500 hover:text-slate-300">
                      Dismiss
                  </button>
                  <button className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded shadow-lg shadow-cyan-500/20 transition-all">
                      Connect Email Stream
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default MagicDropZone;