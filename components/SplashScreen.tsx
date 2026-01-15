
import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onEnter: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const logoUrl = 'https://i.imgur.com/TXJrPwn.png';

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#051a12] flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Fondo con degradado radial */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0a3d2c] via-[#051a12] to-[#010806] opacity-80"></div>

      {/* Elementos decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-[#00D4AA]/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-[#FFD700]/10 rounded-full blur-[100px]"></div>

      {/* Contenedor del Logo */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 transform ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white/5 backdrop-blur-md rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-4 flex items-center justify-center mb-8 animate-pulse-slow border border-white/10">
          <img
            src={logoUrl}
            alt="Margarita Pizzería Logo"
            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          />
        </div>

        <h1 className="text-white text-3xl font-black uppercase tracking-[0.2em] mb-2 text-center drop-shadow-md">
          <span className="text-[#00D4AA]">Margarita</span>
        </h1>
        <p className="text-[#FFD700] text-xs font-black tracking-[0.5em] uppercase opacity-80">Pizzería</p>
        <div className="h-1.5 w-16 bg-[#00D4AA] rounded-full mt-4 mb-20 shadow-[0_0_15px_#00D4AA]"></div>
      </div>

      {/* Botón de Entrada */}
      <div className={`absolute bottom-20 w-full max-w-xs px-6 z-10 transition-all duration-700 delay-500 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <button
          onClick={onEnter}
          className="w-full py-5 font-black text-xl text-[#051a12] bg-[#00D4AA] rounded-[2rem] hover:bg-[#00B894] transition-all transform active:scale-95 shadow-[0_15px_40px_rgba(0,212,170,0.4)] uppercase tracking-widest border-b-4 border-[#009977]"
        >
          Comenzar
        </button>
        <p className="text-white/30 text-[9px] text-center mt-6 font-bold uppercase tracking-[0.3em]">
          Especialistas en Pizza • Gestión de Pedidos
        </p>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
