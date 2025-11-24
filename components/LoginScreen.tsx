import React, { useState, useEffect } from 'react';
import { vault } from '../services/vaultService';

interface LoginScreenProps {
  onUnlock: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'ERROR' | 'SUCCESS' | 'DURESS'>('IDLE');
  
  useEffect(() => {
      if (pin.length === 4) {
          handleUnlock();
      }
  }, [pin]);

  const handleUnlock = async () => {
      setStatus('VERIFYING');
      
      const result = await vault.unlockVault(pin);
      
      if (result === 'SUCCESS') {
          setStatus('SUCCESS');
          setTimeout(onUnlock, 500);
      } else if (result === 'DURESS') {
          setStatus('DURESS');
          setTimeout(onUnlock, 1000); // Slight delay for dramatic effect
      } else {
          setStatus('ERROR');
          setPin('');
          setTimeout(() => setStatus('IDLE'), 1500);
      }
  };

  const handleNum = (num: string) => {
      if (pin.length < 4 && status !== 'VERIFYING') {
          setPin(prev => prev + num);
      }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[100] font-mono">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black opacity-80"></div>
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
                 backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
             }}>
        </div>

        <div className="relative z-10 w-full max-w-xs p-8 flex flex-col items-center">
            <div className="mb-8 relative">
                <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    status === 'ERROR' ? 'border-red-500 bg-red-900/20' : 
                    status === 'SUCCESS' ? 'border-cyan-500 bg-cyan-900/20' :
                    status === 'DURESS' ? 'border-slate-500 bg-slate-900/20' :
                    'border-slate-700 bg-slate-900'
                }`}>
                    <svg className={`w-10 h-10 transition-colors duration-300 ${
                        status === 'ERROR' ? 'text-red-500' :
                        status === 'SUCCESS' ? 'text-cyan-500' :
                        status === 'DURESS' ? 'text-slate-400' :
                        'text-slate-500'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                {status === 'VERIFYING' && (
                    <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
                )}
            </div>

            <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-slate-200 tracking-widest mb-2">AEGIS SECURE</h1>
                <p className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    status === 'ERROR' ? 'text-red-500 font-bold' :
                    status === 'DURESS' ? 'text-slate-500' :
                    'text-slate-500'
                }`}>
                    {status === 'IDLE' && 'Enter Passkey'}
                    {status === 'VERIFYING' && 'Decrypting...'}
                    {status === 'ERROR' && 'Access Denied'}
                    {status === 'SUCCESS' && 'Identity Verified'}
                    {status === 'DURESS' && 'Loading Profile...'}
                </p>
            </div>

            <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < pin.length 
                            ? (status === 'ERROR' ? 'bg-red-500' : 'bg-cyan-500') 
                            : 'bg-slate-800 border border-slate-700'
                    }`}></div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleNum(num.toString())}
                        className="w-16 h-16 rounded-full bg-slate-900/50 border border-slate-700 hover:bg-slate-800 hover:border-cyan-500/50 text-slate-300 text-xl font-light transition-all active:scale-95 active:bg-cyan-900/20"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-16 h-16"></div>
                <button
                    onClick={() => handleNum('0')}
                    className="w-16 h-16 rounded-full bg-slate-900/50 border border-slate-700 hover:bg-slate-800 hover:border-cyan-500/50 text-slate-300 text-xl font-light transition-all active:scale-95"
                >
                    0
                </button>
                <button
                    onClick={() => setPin(prev => prev.slice(0, -1))}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
                </button>
            </div>
            
            <div className="mt-8 opacity-30 text-[9px] text-center">
                <p>AES-256 ENCRYPTION</p>
                <p>LOCAL VAULT STORAGE</p>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;