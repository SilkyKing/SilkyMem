
import React, { useState, useEffect } from 'react';
import { vault } from '../services/vaultService';
import { AuthStage } from '../types';

interface LoginScreenProps {
  onUnlock: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [authStage, setAuthStage] = useState<AuthStage>(AuthStage.CHECKING_STATUS);
  const [setupStep, setSetupStep] = useState<'CREATE' | 'CONFIRM'>('CREATE');
  const [tempFirstPin, setTempFirstPin] = useState('');
  
  const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'ERROR' | 'SUCCESS' | 'DURESS' | 'MISMATCH'>('IDLE');
  
  useEffect(() => {
      // URGENT FIX: FIRST RUN DETECTION
      if (vault.hasPin()) {
          setAuthStage(AuthStage.VAULT_UNLOCK);
      } else {
          setAuthStage(AuthStage.VAULT_SETUP);
      }
  }, []);

  useEffect(() => {
      if (pin.length === 4) {
          handlePinSubmit();
      }
  }, [pin]);

  const handlePinSubmit = async () => {
      if (authStage === AuthStage.VAULT_UNLOCK) {
          // EXISTING UNLOCK FLOW
          setStatus('VERIFYING');
          const result = await vault.unlockVault(pin);
          
          if (result === 'SUCCESS') {
              setStatus('SUCCESS');
              setTimeout(onUnlock, 500);
          } else if (result === 'DURESS') {
              setStatus('DURESS');
              setTimeout(onUnlock, 1000); 
          } else {
              setStatus('ERROR');
              setPin('');
              setTimeout(() => setStatus('IDLE'), 1500);
          }
      } else if (authStage === AuthStage.VAULT_SETUP) {
          // NEW SETUP FLOW
          if (setupStep === 'CREATE') {
              setTempFirstPin(pin);
              setPin('');
              setSetupStep('CONFIRM');
          } else {
              // CONFIRM STEP
              if (pin === tempFirstPin) {
                  setStatus('SUCCESS');
                  vault.setPin(pin); // Save hash
                  setTimeout(() => {
                      onUnlock();
                  }, 800);
              } else {
                  setStatus('MISMATCH');
                  setPin('');
                  setTempFirstPin('');
                  setSetupStep('CREATE'); // Reset flow on mismatch
                  setTimeout(() => setStatus('IDLE'), 1500);
              }
          }
      }
  };

  const handleNum = (num: string) => {
      if (pin.length < 4 && status !== 'VERIFYING' && status !== 'SUCCESS') {
          setPin(prev => prev + num);
      }
  };

  const handleReset = () => {
      if (confirm("FACTORY RESET: This will wipe all local settings, keys, and memories. Continue?")) {
          localStorage.clear();
          window.location.reload();
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
                    status === 'ERROR' || status === 'MISMATCH' ? 'border-red-500 bg-red-900/20' : 
                    status === 'SUCCESS' ? 'border-emerald-500 bg-emerald-900/20' :
                    status === 'DURESS' ? 'border-slate-500 bg-slate-900/20' :
                    authStage === AuthStage.VAULT_SETUP ? 'border-cyan-500 bg-cyan-900/10' :
                    'border-slate-700 bg-slate-900'
                }`}>
                    <svg className={`w-10 h-10 transition-colors duration-300 ${
                        status === 'ERROR' || status === 'MISMATCH' ? 'text-red-500' :
                        status === 'SUCCESS' ? 'text-emerald-500' :
                        status === 'DURESS' ? 'text-slate-400' :
                        authStage === AuthStage.VAULT_SETUP ? 'text-cyan-400' :
                        'text-slate-500'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {authStage === AuthStage.VAULT_SETUP ? (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        )}
                    </svg>
                </div>
                {(status === 'VERIFYING' || status === 'SUCCESS') && (
                    <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
                )}
            </div>

            <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-slate-200 tracking-widest mb-2">
                    {authStage === AuthStage.VAULT_SETUP ? 'INITIALIZE NEXUS' : 'NEXUS SECURE'}
                </h1>
                
                <p className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    status === 'ERROR' || status === 'MISMATCH' ? 'text-red-500 font-bold' :
                    status === 'DURESS' ? 'text-slate-500' :
                    authStage === AuthStage.VAULT_SETUP ? 'text-cyan-400' :
                    'text-slate-500'
                }`}>
                    {status === 'VERIFYING' && 'Decrypting...'}
                    {status === 'SUCCESS' && (authStage === AuthStage.VAULT_SETUP ? 'Vault Initialized' : 'Identity Verified')}
                    {status === 'ERROR' && 'Access Denied'}
                    {status === 'DURESS' && 'Loading Profile...'}
                    {status === 'MISMATCH' && 'PIN Mismatch - Retry'}
                    {status === 'IDLE' && (
                        authStage === AuthStage.VAULT_SETUP 
                            ? (setupStep === 'CREATE' ? 'Set Master PIN' : 'Confirm Master PIN')
                            : 'Enter Passkey'
                    )}
                </p>
            </div>

            <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        i < pin.length 
                            ? (status === 'ERROR' || status === 'MISMATCH' ? 'bg-red-500' : authStage === AuthStage.VAULT_SETUP ? 'bg-cyan-500' : 'bg-emerald-500') 
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
            
            <div className="mt-8 opacity-30 text-[9px] text-center space-y-2">
                <p>AES-256 ENCRYPTION</p>
                <p>LOCAL VAULT STORAGE</p>
                <button 
                    onClick={handleReset}
                    className="mt-4 text-[9px] text-slate-600 hover:text-red-500 underline decoration-slate-800 transition-colors"
                >
                    Reset / Dev Mode
                </button>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;
