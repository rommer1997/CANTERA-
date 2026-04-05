import React, { useState } from 'react';
import { 
  Search, Lock, Unlock, TrendingUp, Mail, Filter, 
  ShieldCheck, Activity, MapPin, ChevronRight, Eye, Star, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Player, MOCK_PLAYERS, MOCK_SCOUT, checkDataAccess } from '../core/domain';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../core/i18n/LanguageContext';

type ScoutTab = 'hub' | 'pipeline' | 'contact';

export default function Cantera4Scout() {
  const [activeTab, setActiveTab] = useState<ScoutTab>('hub');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#D4AF37]/30 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur-md border-b border-[#2A2A2A] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Eye className="text-[#A1C4FD]" size={24} />
          <h1 className="text-xl font-bold tracking-tight">{t('scout.terminal')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-xs text-gray-500 uppercase tracking-widest">{t('scout.agency')}</p>
            <p className="text-sm font-medium">{MOCK_SCOUT.name}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-[#D4AF37]">
            <span className="text-xs font-bold text-[#D4AF37]">PRO</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'hub' && !selectedPlayer && (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                  type="text" 
                  placeholder={t('scout.search_placeholder')} 
                  className="w-full bg-white/[0.02] border border-[#2A2A2A] rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#A1C4FD] transition-colors"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#A1C4FD]">
                  <Filter size={20} />
                </button>
              </div>

              {/* Feed */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_PLAYERS.map(player => (
                  <PlayerSnippet key={player.id} player={player} onClick={() => setSelectedPlayer(player)} />
                ))}
              </div>
            </motion.div>
          )}

          {selectedPlayer && (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-white mb-6 flex items-center gap-2 text-sm">
                <ChevronRight className="rotate-180" size={16} /> {t('scout.back')}
              </button>
              <PlayerDeepDive player={selectedPlayer} />
            </motion.div>
          )}

          {activeTab === 'pipeline' && !selectedPlayer && (
            <motion.div key="pipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-[#A1C4FD]">{t('scout.market_pipeline')}</h2>
              <p className="text-sm text-gray-400">{t('scout.pipeline_desc')}</p>
              
              <div className="p-4 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-start gap-4 mb-8">
                <Star className="text-[#D4AF37] shrink-0 mt-1" size={20} />
                <div>
                  <p className="font-bold text-[#D4AF37]">{t('scout.rating_update')}</p>
                  <p className="text-sm text-gray-300 mt-1">Mateo Silva {t('scout.rating_desc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_PLAYERS.filter(p => MOCK_SCOUT.pipeline.includes(p.id)).map(player => (
                  <PlayerSnippet key={player.id} player={player} onClick={() => setSelectedPlayer(player)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 w-full bg-[#121212]/95 backdrop-blur-xl border-t border-[#2A2A2A] z-40">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <NavBtn icon={<Search />} label={t('scout.discovery')} active={activeTab === 'hub' && !selectedPlayer} onClick={() => { setActiveTab('hub'); setSelectedPlayer(null); }} />
          <NavBtn icon={<TrendingUp />} label={t('scout.pipeline')} active={activeTab === 'pipeline' && !selectedPlayer} onClick={() => { setActiveTab('pipeline'); setSelectedPlayer(null); }} />
          <NavBtn icon={<Mail />} label={t('scout.contact')} active={activeTab === 'contact'} onClick={() => setActiveTab('contact')} />
        </div>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-colors",
        active ? "text-[#A1C4FD]" : "text-gray-600 hover:text-gray-400"
      )}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function PlayerSnippet({ player, onClick }: { player: Player, onClick: () => void, key?: string }) {
  const hasAccess = checkDataAccess(MOCK_SCOUT, player.id);
  const { t } = useLanguage();

  return (
    <div 
      onClick={onClick}
      className="p-5 rounded-xl border border-[#2A2A2A] bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg group-hover:text-[#A1C4FD] transition-colors flex items-center gap-2">
            {player.name}
            {player.isValidated && (
              <ShieldCheck 
                size={16} 
                className={cn(
                  player.verificationTier === 'DIAMOND_PRO' ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" :
                  player.verificationTier === 'DIAMOND' ? "text-cyan-400" :
                  "text-[#D4AF37]"
                )} 
              />
            )}
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{player.position} • {player.age} {t('cv.age').toLowerCase()}</p>
        </div>
        <div className="p-2 rounded-lg bg-[#2A2A2A]">
          {hasAccess ? <Unlock size={16} className="text-[#A1C4FD]" /> : <Lock size={16} className="text-[#D4AF37]" />}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center border-t border-[#2A2A2A] pt-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">{t('scout.matches')}</p>
          <p className="font-mono text-sm">{player.baseMetrics.matchesPlayed}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">{t('scout.goals')}</p>
          <p className="font-mono text-sm">{player.baseMetrics.goals}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">{t('scout.assists')}</p>
          <p className="font-mono text-sm">{player.baseMetrics.assists}</p>
        </div>
      </div>
    </div>
  );
}

function PlayerDeepDive({ player }: { player: Player }) {
  const hasAccess = checkDataAccess(MOCK_SCOUT, player.id);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { t } = useLanguage();

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      // Simulate payment success and state update
      MOCK_SCOUT.unlockedPlayers.push(player.id);
      setIsUnlocking(false);
    }, 1500);
  };

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
        <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-[#D4AF37]" />
        </div>
        <h2 className="text-3xl font-bold">{t('scout.paywall_title')}</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          {player.name} {t('scout.paywall_desc')}
        </p>
        
        <div className="p-6 rounded-2xl border border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/10 to-transparent text-left max-w-sm mx-auto">
          <h3 className="font-bold text-lg mb-2 text-[#D4AF37]">{t('scout.unlock_title')}</h3>
          <ul className="text-sm text-gray-300 space-y-2 mb-6">
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> {t('scout.unlock_item1')}</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> {t('scout.unlock_item2')}</li>
            <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#D4AF37]" /> {t('scout.unlock_item3')}</li>
          </ul>
          <button 
            onClick={handleUnlock}
            disabled={isUnlocking}
            className="w-full py-3 bg-[#D4AF37] text-[#121212] font-bold rounded-xl hover:bg-[#b5952f] transition-colors flex justify-center items-center gap-2"
          >
            {isUnlocking ? <span className="animate-pulse">{t('scout.processing')}</span> : t('scout.unlock_button')}
          </button>
        </div>
      </div>
    );
  }

  // Unlocked View (Technical Deep-Dive)
  const radarData = [
    { subject: 'PAC', A: 78, fullMark: 100 },
    { subject: 'SHO', A: 72, fullMark: 100 },
    { subject: 'PAS', A: 88, fullMark: 100 },
    { subject: 'DRI', A: 85, fullMark: 100 },
    { subject: 'DEF', A: 70, fullMark: 100 },
    { subject: 'PHY', A: 76, fullMark: 100 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#2A2A2A] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold">{player.name}</h2>
            {player.isValidated && <span className="px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded text-xs font-bold tracking-wider">{t('cv.verified')}</span>}
          </div>
          <p className="text-gray-400 font-mono">{player.position} • {player.team} • {player.age} {t('cv.age').toLowerCase()}</p>
        </div>
        <button className="px-6 py-3 bg-[#A1C4FD]/10 text-[#A1C4FD] border border-[#A1C4FD]/30 rounded-xl font-bold hover:bg-[#A1C4FD]/20 transition-colors flex items-center gap-2">
          <Mail size={18} /> {t('scout.contact_tutor')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Ratings */}
        <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-white/[0.01]">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#D4AF37]" /> {t('scout.official_ratings')}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('ref.technical')}</span>
                <span className="font-mono text-[#D4AF37] text-lg">{player.sensitiveData.refereeTechnicalRating}/100</span>
              </div>
              <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37]" style={{ width: `${player.sensitiveData.refereeTechnicalRating}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{t('ref.fairplay')}</span>
                <span className="font-mono text-[#D4AF37] text-lg">{player.sensitiveData.refereeFairPlayRating}/100</span>
              </div>
              <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37]" style={{ width: `${player.sensitiveData.refereeFairPlayRating}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-6 rounded-2xl border border-[#A1C4FD]/30 bg-[#A1C4FD]/5">
          <h3 className="text-sm text-[#A1C4FD] uppercase tracking-widest mb-6 flex items-center gap-2">
            <Lock size={16} /> {t('scout.unlocked_data')}
          </h3>
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between border-b border-[#2A2A2A] pb-2">
              <span className="text-gray-500">{t('scout.tutor_phone')}</span>
              <span>{player.sensitiveData.tutorPhone}</span>
            </div>
            <div className="flex justify-between border-b border-[#2A2A2A] pb-2">
              <span className="text-gray-500">{t('scout.tutor_email')}</span>
              <span>{player.sensitiveData.tutorEmail}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-500">{t('scout.heatmap')}</span>
              <span className="text-[#A1C4FD] underline cursor-pointer">{t('scout.view_matrix')}</span>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-white/[0.01] md:col-span-2 flex flex-col items-center">
          <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-6 w-full text-left">{t('scout.technical_deepdive')}</h3>
          <div className="w-full max-w-md h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#2A2A2A" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#A1C4FD', opacity: 0.8, fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Player" dataKey="A" stroke="#A1C4FD" strokeWidth={2} fill="#A1C4FD" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
