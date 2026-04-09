import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Play, Square, AlertTriangle, FileSignature, 
  CheckCircle, ShieldCheck, Activity, ChevronRight, User, Settings,
  Award, BarChart3, Globe, Shield, MapPin, Search, Star, Trophy, Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Match, MatchEvent, MOCK_PLAYERS, finishMatchAndEvaluate } from '../core/domain';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../core/i18n/LanguageContext';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

type RefTab = 'match_center' | 'live_console' | 'evaluation' | 'integrity' | 'profile';

export default function Cantera3Referee() {
  const [activeTab, setActiveTab] = useState<RefTab>('match_center');
  const [matchStatus, setMatchStatus] = useState<'SCHEDULED' | 'LIVE' | 'COMPLETED'>('SCHEDULED');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [timer, setTimer] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedMatchPlayer, setSelectedMatchPlayer] = useState<{id: string, name: string, number: number, team: string} | null>(null);
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { t } = useLanguage();

  const MATCH_PLAYERS = {
    home: {
      name: 'Real Madrid U19',
      color: 'bg-white text-charcoal border-gray-200',
      players: [
        { id: 'PLY-001', name: 'Mateo Silva', number: 10, position: 'CM' },
        { id: 'PLY-002', name: 'Carlos Ruiz', number: 7, position: 'RW' },
        { id: 'PLY-003', name: 'Hugo Sanchez', number: 9, position: 'ST' },
      ]
    },
    away: {
      name: 'FC Barcelona U19',
      color: 'bg-[#004D98] text-white border-[#A50044]',
      players: [
        { id: 'PLY-004', name: 'Pedri Gonzalez', number: 8, position: 'CM' },
        { id: 'PLY-005', name: 'Ansu Fati', number: 10, position: 'LW' },
        { id: 'PLY-006', name: 'Ronald Araujo', number: 4, position: 'CB' },
      ]
    }
  };

  // Timer logic for Live Console
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (matchStatus === 'LIVE') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [matchStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAddEvent = (type: MatchEvent['type']) => {
    if (!selectedMatchPlayer) return;
    const newEvent: MatchEvent = {
      id: Math.random().toString(),
      type,
      time: formatTime(timer),
      playerId: selectedMatchPlayer.id,
      playerName: selectedMatchPlayer.name
    };
    setEvents([newEvent, ...events]);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal text-charcoal dark:text-white font-sans selection:bg-gold/30 pb-32 transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-charcoal/90 backdrop-blur-md border-b border-border-subtle px-6 py-4 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#D4AF37]" size={24} />
            <Logo size="md" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[#A1C4FD] hidden md:inline">{t('ref.system_online')}</span>
          </div>
          <button className="relative text-charcoal/40 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-charcoal"></span>
          </button>
          <button onClick={() => navigate('/settings')} className="text-charcoal/40 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'match_center' && (
            <motion.div key="mc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <h2 className="text-2xl font-bold text-[#D4AF37]">{t('ref.match_center')}</h2>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('evaluations')}
                  className="p-6 rounded-2xl border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-charcoal dark:text-white">Scan Player QR</h3>
                      <p className="text-xs text-charcoal/50 dark:text-gray-400">Quickly evaluate a player</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gold group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="p-6 rounded-2xl border border-border-subtle dark:border-[#2A2A2A] bg-black/5 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-charcoal dark:text-white">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-charcoal dark:text-white">Pending Evaluations</h3>
                      <p className="text-xs text-charcoal/50 dark:text-gray-400">3 players waiting</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveTab('evaluations')} className="text-sm font-bold text-[#A1C4FD] hover:underline">View</button>
                </div>
              </div>

              {/* Next Match Card */}
              <div className="p-6 rounded-2xl border border-border-subtle dark:border-[#2A2A2A] bg-black/5 dark:bg-white/[0.02] backdrop-blur-sm relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#A1C4FD]" />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs text-[#A1C4FD] uppercase tracking-widest mb-1 font-mono">{t('ref.next_assignment')}</p>
                    <h3 className="text-xl font-bold text-charcoal dark:text-white">Real Madrid U19 vs FC Barcelona U19</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono text-[#A1C4FD]">14:00</p>
                    <p className="text-sm text-charcoal/50 dark:text-gray-500 transition-colors">Today, Estadio Alfredo Di Stefano</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setMatchStatus('LIVE'); setActiveTab('live_console'); }}
                  className="w-full py-4 bg-gold text-charcoal font-bold rounded-xl hover:bg-gold/80 transition-colors flex justify-center items-center gap-2"
                >
                  <Play size={20} /> {t('ref.initialize')}
                </button>
              </div>

              {/* Agenda */}
              <div>
                <h3 className="text-sm text-charcoal/50 dark:text-gray-500 uppercase tracking-widest mb-4 transition-colors">{t('ref.upcoming')}</h3>
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 rounded-xl border border-border-subtle dark:border-[#2A2A2A] flex justify-between items-center opacity-50 transition-colors">
                      <div>
                        <p className="font-medium text-charcoal dark:text-white">Atletico Madrid U19 vs Getafe U19</p>
                        <p className="text-xs text-charcoal/50 dark:text-gray-500">Tomorrow, 16:00</p>
                      </div>
                      <Calendar size={18} className="text-charcoal/50 dark:text-gray-500" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'live_console' && (
            <motion.div key="lc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> {t('ref.live_console')}
                </h2>
                <div className="text-5xl font-mono text-[#A1C4FD] tracking-tighter">
                  {formatTime(timer)}
                </div>
              </div>

              {/* Match Teams & Players */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team */}
                <div className="space-y-3">
                  <div className={cn("p-3 rounded-xl border font-bold text-center", MATCH_PLAYERS.home.color)}>
                    {MATCH_PLAYERS.home.name}
                  </div>
                  {MATCH_PLAYERS.home.players.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedMatchPlayer({...p, team: MATCH_PLAYERS.home.name})}
                      className={cn(
                        "w-full p-3 rounded-xl border flex items-center justify-between transition-all",
                        selectedMatchPlayer?.id === p.id 
                          ? "border-[#A1C4FD] bg-[#A1C4FD]/10" 
                          : "border-border-subtle dark:border-[#2A2A2A] bg-black/5 dark:bg-white/[0.02] hover:bg-black/10 dark:hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-charcoal dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">{p.number}</span>
                        <span className="font-medium text-charcoal dark:text-white">{p.name}</span>
                      </div>
                      <span className="text-xs text-charcoal/50 dark:text-gray-500 font-mono">{p.position}</span>
                    </button>
                  ))}
                </div>
                {/* Away Team */}
                <div className="space-y-3">
                  <div className={cn("p-3 rounded-xl border font-bold text-center", MATCH_PLAYERS.away.color)}>
                    {MATCH_PLAYERS.away.name}
                  </div>
                  {MATCH_PLAYERS.away.players.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedMatchPlayer({...p, team: MATCH_PLAYERS.away.name})}
                      className={cn(
                        "w-full p-3 rounded-xl border flex items-center justify-between transition-all",
                        selectedMatchPlayer?.id === p.id 
                          ? "border-[#A1C4FD] bg-[#A1C4FD]/10" 
                          : "border-border-subtle dark:border-[#2A2A2A] bg-black/5 dark:bg-white/[0.02] hover:bg-black/10 dark:hover:bg-white/[0.05]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-charcoal dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">{p.number}</span>
                        <span className="font-medium text-charcoal dark:text-white">{p.name}</span>
                      </div>
                      <span className="text-xs text-charcoal/50 dark:text-gray-500 font-mono">{p.position}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Panel (Only visible if a player is selected) */}
              {selectedMatchPlayer ? (
                <div className="p-6 rounded-2xl border border-[#A1C4FD]/30 bg-[#A1C4FD]/5 space-y-6">
                  <div className="flex justify-between items-center border-b border-[#A1C4FD]/20 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-charcoal dark:text-white flex items-center gap-2">
                        <span className="bg-charcoal dark:bg-white text-white dark:text-black px-2 py-0.5 rounded text-sm">#{selectedMatchPlayer.number}</span>
                        {selectedMatchPlayer.name}
                      </h3>
                      <p className="text-xs text-charcoal/50 dark:text-gray-400 mt-1">{selectedMatchPlayer.team}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-charcoal/50 dark:text-gray-400 uppercase tracking-widest mb-1">Live Rating</p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="1" max="10" 
                          value={playerRatings[selectedMatchPlayer.id] || 5}
                          onChange={(e) => setPlayerRatings({...playerRatings, [selectedMatchPlayer.id]: parseInt(e.target.value)})}
                          className="w-24 accent-[#A1C4FD]"
                        />
                        <span className="font-mono font-bold text-[#A1C4FD] text-lg w-6 text-center">{playerRatings[selectedMatchPlayer.id] || 5}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => handleAddEvent('GOAL')} className="h-20 rounded-xl border border-border-subtle dark:border-[#2A2A2A] bg-white dark:bg-charcoal hover:bg-black/5 dark:hover:bg-white/5 flex flex-col items-center justify-center gap-1 transition-colors text-charcoal dark:text-white">
                      <div className="w-6 h-6 rounded-full bg-charcoal dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">G</div>
                      <span className="text-xs font-medium">{t('ref.goal')}</span>
                    </button>
                    <button onClick={() => handleAddEvent('YELLOW_CARD')} className="h-20 rounded-xl border border-[#eab308]/30 bg-[#eab308]/10 hover:bg-[#eab308]/20 flex flex-col items-center justify-center gap-1 transition-colors text-charcoal dark:text-white">
                      <div className="w-4 h-6 bg-[#eab308] rounded-sm" />
                      <span className="text-xs font-medium">{t('ref.yellow_card')}</span>
                    </button>
                    <button onClick={() => handleAddEvent('RED_CARD')} className="h-20 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 flex flex-col items-center justify-center gap-1 transition-colors text-charcoal dark:text-white">
                      <div className="w-4 h-6 bg-red-500 rounded-sm" />
                      <span className="text-xs font-medium">{t('ref.red_card')}</span>
                    </button>
                    <button onClick={() => handleAddEvent('SUBSTITUTION')} className="h-20 rounded-xl border border-border-subtle dark:border-[#2A2A2A] bg-white dark:bg-charcoal hover:bg-black/5 dark:hover:bg-white/5 flex flex-col items-center justify-center gap-1 transition-colors text-charcoal dark:text-white">
                      <Activity size={20} className="text-[#A1C4FD]" />
                      <span className="text-xs font-medium">{t('ref.substitution')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-border-subtle dark:border-[#2A2A2A] text-center text-charcoal/40 dark:text-gray-500">
                  Select a player above to evaluate or add events.
                </div>
              )}

              {/* Event Log */}
              <div className="p-6 rounded-xl border border-border-subtle dark:border-[#2A2A2A] bg-black/[0.01] dark:bg-white/[0.01] min-h-[200px] transition-colors">
                <h3 className="text-sm text-charcoal/50 dark:text-gray-500 uppercase tracking-widest mb-4 transition-colors">{t('ref.match_log')}</h3>
                <div className="space-y-3">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center gap-4 text-sm border-b border-border-subtle dark:border-[#2A2A2A] pb-2 transition-colors">
                      <span className="font-mono text-[#A1C4FD] w-12">{ev.time}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        ev.type === 'GOAL' ? "bg-charcoal dark:bg-white text-white dark:text-black" :
                        ev.type === 'YELLOW_CARD' ? "bg-[#eab308] text-black" :
                        ev.type === 'RED_CARD' ? "bg-red-500 text-white" : "bg-[#A1C4FD] text-black"
                      )}>{t(`ref.${ev.type.toLowerCase()}`)}</span>
                      <span className="text-charcoal dark:text-white transition-colors">{ev.playerName}</span>
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-charcoal/40 dark:text-gray-600 italic text-sm transition-colors">{t('ref.no_events')}</p>}
                </div>
              </div>

              <button 
                onClick={() => { setMatchStatus('COMPLETED'); setActiveTab('evaluation'); }}
                className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/30 font-bold rounded-xl hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2"
              >
                <Square size={20} /> {t('ref.terminate')}
              </button>
            </motion.div>
          )}

          {activeTab === 'evaluation' && (
            <motion.div key="ev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#D4AF37]">{t('ref.evaluation')}</h2>
                  <p className="text-sm text-gray-400">{t('ref.generate_report')}</p>
                </div>
                <div className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold border border-gold/20">
                  STRICT MODE
                </div>
              </div>
              
              <div className="space-y-4">
                {MOCK_PLAYERS.map(player => (
                  <EvaluationCard key={player.id} player={player} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="prof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-8 rounded-3xl bg-black/5 dark:bg-white/[0.02] border border-border-subtle relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center text-gold border-2 border-gold/30 shrink-0">
                  <User size={48} />
                </div>
                <div className="relative z-10 flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                    <h2 className="text-3xl font-bold">Carlos Rodriguez</h2>
                    <span className="w-fit mx-auto md:mx-0 px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-[10px] font-black tracking-tighter">
                      DIAMOND PRO
                    </span>
                  </div>
                  <p className="text-gold font-medium uppercase tracking-widest text-xs mb-4">Elite Referee • RFEF Level 1</p>
                  <div className="flex justify-center md:justify-start gap-6">
                    <div className="text-center">
                      <p className="text-xl font-bold">142</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Matches</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">4.8</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold">8</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Years</p>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col gap-2 w-full md:w-auto">
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <FileSignature size={14} /> Edit Profile
                  </button>
                  <button 
                    onClick={() => setIsAvailable(!isAvailable)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                      isAvailable ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", isAvailable ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {isAvailable ? 'Available' : 'Busy'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Certifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Award size={20} className="text-gold" /> Certifications
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: 'RFEF Elite License', level: 'Level 1', date: '2025' },
                      { title: 'FIFA Badge', level: 'International', date: '2024' },
                      { title: 'VAR Specialist', level: 'Certified', date: '2023' },
                    ].map((cert, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border-subtle bg-black/[0.01] dark:bg-white/[0.01] flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm">{cert.title}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{cert.level} • Issued {cert.date}</p>
                        </div>
                        <ShieldCheck size={18} className="text-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <BarChart3 size={20} className="text-[#A1C4FD]" /> Performance
                  </h3>
                  <div className="p-6 rounded-2xl border border-border-subtle bg-black/[0.01] dark:bg-white/[0.01] space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 uppercase font-bold tracking-wider">Foul Accuracy</span>
                        <span className="text-emerald-500 font-mono">94%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[94%] h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 uppercase font-bold tracking-wider">VAR Consistency</span>
                        <span className="text-[#A1C4FD] font-mono">88%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[88%] h-full bg-[#A1C4FD] rounded-full" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-lg font-bold text-yellow-500">3.2</p>
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Avg Yellows</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-lg font-bold text-red-500">0.4</p>
                        <p className="text-[8px] text-gray-500 uppercase font-bold">Avg Reds</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match History */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-lg font-bold">Recent Match History</h3>
                  <button className="text-xs text-gold hover:underline">View Full Archive</button>
                </div>
                <div className="space-y-3">
                  {[
                    { teams: 'Real Madrid vs Atletico', date: '2026-03-28', score: '2-1', status: 'Verified', league: 'La Liga U19' },
                    { teams: 'Valencia vs Villarreal', date: '2026-03-21', score: '0-0', status: 'Verified', league: 'Copa del Rey' },
                    { teams: 'Sevilla vs Real Betis', date: '2026-03-14', score: '1-3', status: 'Verified', league: 'La Liga U19' },
                  ].map((match, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border-subtle bg-black/[0.01] dark:bg-white/[0.01] flex justify-between items-center group hover:border-gold/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-400">
                          <Trophy size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{match.teams}</p>
                          <p className="text-[10px] text-gray-500">{match.date} • {match.league} • Result: {match.score}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle size={14} /> {match.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'integrity' && (
            <motion.div key="in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-[#D4AF37]">{t('ref.integrity')}</h2>
              
              <div className="grid gap-4">
                <div className="p-4 rounded-xl border border-[#2A2A2A] flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]"><FileSignature size={24} /></div>
                    <div>
                      <p className="font-medium">Match Act: RMA vs FCB</p>
                      <p className="text-xs text-gray-500">Signed cryptographically • 2 hours ago</p>
                    </div>
                  </div>
                  <button className="text-[#A1C4FD] text-sm hover:underline">View PDF</button>
                </div>
                <div className="p-4 rounded-xl border border-[#2A2A2A] flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#A1C4FD]/10 rounded-lg text-[#A1C4FD]"><ShieldCheck size={24} /></div>
                    <div>
                      <p className="font-medium">RFEF Regulations 2026</p>
                      <p className="text-xs text-gray-500">Document Vault</p>
                    </div>
                  </div>
                  <button className="text-[#A1C4FD] text-sm hover:underline">Access</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/80 dark:bg-charcoal/80 backdrop-blur-xl border border-border-subtle/50 rounded-full shadow-2xl z-50 px-2 py-2 transition-all duration-300">
        <div className="flex justify-around items-center h-14">
          <NavBtn icon={<Calendar />} label={t('nav.matches')} active={activeTab === 'match_center'} onClick={() => setActiveTab('match_center')} />
          <NavBtn icon={<Clock />} label={t('nav.live')} active={activeTab === 'live_console'} onClick={() => setActiveTab('live_console')} disabled={matchStatus === 'SCHEDULED'} />
          <NavBtn icon={<CheckCircle />} label={t('nav.eval')} active={activeTab === 'evaluation'} onClick={() => setActiveTab('evaluation')} disabled={matchStatus !== 'COMPLETED'} />
          <NavBtn icon={<User />} label={t('nav.profile')} active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <NavBtn icon={<FileSignature />} label={t('nav.docs')} active={activeTab === 'integrity'} onClick={() => setActiveTab('integrity')} />
        </div>
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, disabled }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-all duration-300",
        active ? "text-[#D4AF37] bg-gold/10 scale-110" : "text-charcoal/60 dark:text-gray-400 hover:text-charcoal dark:hover:text-white",
        disabled && "opacity-20 cursor-not-allowed"
      )}
    >
      {React.cloneElement(icon, { size: 18 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function EvaluationCard({ player }: { player: any; key?: string }) {
  const [tech, setTech] = useState(80);
  const [fair, setFair] = useState(80);
  const [phys, setPhys] = useState(80);
  const [tact, setTact] = useState(80);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = () => {
    finishMatchAndEvaluate(player.id, tech, fair);
    setSubmitted(true);
  };

  return (
    <div className="p-6 rounded-xl border border-border-subtle dark:border-[#2A2A2A] bg-black/5 dark:bg-white/[0.02] transition-colors">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold/30">
            <img src={player.image || "https://picsum.photos/seed/player/100/100"} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <p className="font-bold text-charcoal dark:text-white transition-colors">{player.name}</p>
            <p className="text-xs text-[#A1C4FD] font-mono">{player.position} • {player.team || 'Academy'}</p>
          </div>
        </div>
        {submitted && <span className="text-xs font-bold text-[#D4AF37] border border-[#D4AF37] px-2 py-1 rounded">{t('ref.validated')}</span>}
      </div>

      {!submitted ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-charcoal/50 dark:text-gray-400 transition-colors uppercase text-[10px] tracking-widest font-bold">{t('ref.technical')}</span>
                <span className="font-mono text-[#A1C4FD]">{tech}/100</span>
              </div>
              <input type="range" min="0" max="100" value={tech} onChange={(e) => setTech(Number(e.target.value))} className="w-full accent-gold" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-charcoal/50 dark:text-gray-400 transition-colors uppercase text-[10px] tracking-widest font-bold">{t('ref.fairplay')}</span>
                <span className="font-mono text-[#A1C4FD]">{fair}/100</span>
              </div>
              <input type="range" min="0" max="100" value={fair} onChange={(e) => setFair(Number(e.target.value))} className="w-full accent-gold" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-charcoal/50 dark:text-gray-400 transition-colors uppercase text-[10px] tracking-widest font-bold">Physical</span>
                <span className="font-mono text-[#A1C4FD]">{phys}/100</span>
              </div>
              <input type="range" min="0" max="100" value={phys} onChange={(e) => setPhys(Number(e.target.value))} className="w-full accent-gold" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-charcoal/50 dark:text-gray-400 transition-colors uppercase text-[10px] tracking-widest font-bold">Tactical</span>
                <span className="font-mono text-[#A1C4FD]">{tact}/100</span>
              </div>
              <input type="range" min="0" max="100" value={tact} onChange={(e) => setTact(Number(e.target.value))} className="w-full accent-gold" />
            </div>
          </div>
          
          <div className="pt-4">
            <button 
              onClick={handleSubmit}
              className="w-full py-3 bg-gold text-black rounded-lg text-sm font-bold hover:bg-gold/80 transition-colors shadow-lg shadow-gold/10"
            >
              {t('ref.submit')}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400 text-sm">
          <CheckCircle size={18} /> {t('ref.report_generated')}
        </div>
      )}
    </div>
  );
}
