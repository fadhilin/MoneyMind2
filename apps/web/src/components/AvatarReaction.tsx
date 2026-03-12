import React from 'react';
import { useAvatarStatus } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';

const AvatarReaction: React.FC = () => {
  const { user } = useAuth();
  const displayName = user?.name ?? 'User';
  const { data: avatarData, isLoading } = useAvatarStatus();
  const status = avatarData?.status || 'NORMAL';

  if (isLoading) return <div className="size-16 animate-pulse bg-slate-200 dark:bg-white/10 rounded-full" />;

  const getAvatarConfig = () => {
    switch (status) {
      case 'SAVINGS_REACHED':
        return {
          icon: 'celebration',
          color: 'text-yellow-500',
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          label: 'Yeay tabungan tercapai!',
          animation: 'animate-bounce',
          effect: 'confetti'
        };
      case 'IMPULSE_BUY':
        return {
          icon: 'error',
          color: 'text-rose-500',
          bg: 'bg-rose-100 dark:bg-rose-900/30',
          label: 'Anjir boros banget kamu!',
          animation: 'animate-shake',
          effect: 'sweat'
        };
      case 'OVER_BUDGET':
        return {
          icon: 'sentiment_very_dissatisfied',
          color: 'text-rose-500',
          bg: 'bg-rose-100 dark:bg-rose-900/30',
          label: 'Anjir anggaran kamu bocor!',
          animation: 'animate-shake',
          effect: 'rain'
        };
      case 'BUDGET_OVER_50':
        return {
          icon: 'sentiment_dissatisfied',
          color: 'text-amber-500',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          label: 'Waspada, budget sudah 50%!',
          animation: 'animate-float',
          effect: 'sweat'
        };
      case 'NO_TRANSACTION':
        return {
          icon: 'bedtime',
          color: 'text-slate-400',
          bg: 'bg-slate-100 dark:bg-slate-800/50',
          label: 'Nganggur ya?',
          animation: 'animate-float-slow',
          effect: 'zzz'
        };
      default:
        return {
          icon: 'sentiment_satisfied',
          color: 'text-primary',
          bg: 'bg-primary/10',
          label: `Haii ${displayName} 👋`,
          animation: 'animate-float',
          effect: 'smile'
        };
    }
  };

  const config = getAvatarConfig();

  return (
    <div className="relative flex flex-col items-center group cursor-pointer mt-6">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
        @keyframes rain {
          0% { transform: translateY(-20px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(20px); opacity: 0; }
        }
        @keyframes zzz {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(10px, -20px) scale(1.2); opacity: 0; }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 5s ease-in-out infinite; }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
        
        .rain-drop {
          position: absolute;
          width: 2px;
          height: 8px;
          background: #3b82f6;
          border-radius: 99px;
          animation: rain 1.5s linear infinite;
        }
        .zzz-char {
          position: absolute;
          font-weight: bold;
          font-size: 10px;
          color: #94a3b8;
          animation: zzz 2s ease-out infinite;
        }
        .confetti-piece {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 2px;
          animation: rain 2s ease-out infinite;
        }
      `}</style>

      {/* Background Effects */}
      {config.effect === 'rain' && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="rain-drop" style={{ left: '20%', animationDelay: '0s' }} />
          <div className="rain-drop" style={{ left: '50%', animationDelay: '0.4s' }} />
          <div className="rain-drop" style={{ left: '80%', animationDelay: '0.8s' }} />
        </div>
      )}

      {config.effect === 'zzz' && (
        <div className="absolute -top-4 -right-2 z-0 pointer-events-none">
          <span className="zzz-char" style={{ animationDelay: '0s' }}>Z</span>
          <span className="zzz-char" style={{ animationDelay: '0.7s', left: '10px', top: '-10px' }}>Z</span>
          <span className="zzz-char" style={{ animationDelay: '1.4s', left: '20px', top: '-5px' }}>Z</span>
        </div>
      )}

      {config.effect === 'confetti' && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none scale-150">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="confetti-piece" 
              style={{ 
                left: `${i * 20}%`, 
                animationDelay: `${i * 0.3}s`,
                backgroundColor: ['#f59e0b', '#ef4444', '#10b981', '#3b82f6'][i % 4]
              }} 
            />
          ))}
        </div>
      )}

      {/* Avatar Container */}
      <div className={`relative z-10 size-16 md:size-20 rounded-full flex items-center justify-center ${config.bg} border-2 border-white/50 dark:border-white/10 shadow-lg ${config.animation}`}>
        <span className={`material-symbols-outlined text-4xl md:text-5xl ${config.color} selection:bg-transparent`}>
          {config.icon}
        </span>
        
        {/* Glow effect for savings */}
        {status === 'SAVINGS_REACHED' && (
          <div className="absolute -inset-2 bg-yellow-400/20 blur-xl rounded-full animate-pulse z-[-1]" />
        )}
      </div>

      <div className="mt-2 px-3 py-1 flex items-center justify-center text-center bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-full border border-slate-200 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-400 text-center">
          {config.label}
        </p>
      </div>
    </div>
  );
};

export default AvatarReaction;
