import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Play, Square, AlertTriangle, FileSignature, 
  CheckCircle, ShieldCheck, Activity, ChevronRight, User, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Match, MatchEvent, MOCK_PLAYERS, finishMatchAndEvaluate } from '../core/domain';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../core/i18n/LanguageContext';

type RefTab = 'match_center' | 'live_console' | 'evaluation' | 'integrity';

export default function Cantera3Referee() {
  const [activeTab, setActiveTab] = useState<RefTab>('match_center');
  const [matchStatus, setMatchStatus] = useState<'SCHEDULED' | 'LIVE' | 'COMPLETED'>('SCHEDULED');
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
    const newEvent: MatchEvent = {
      id: Math.random().toString(),
      type,
      time: formatTime(timer),
      playerId: 'PLY-001',
      playerName: 'Mateo Silva' // Mocked for speed
    };
    setEvents([newEvent, ...events]);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-[#D4AF37]/30 pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#121212]/90 backdrop-blur-md border-b border-[#2A2A2A] px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#D4AF37]" size={24} />
          <h1 className="text-xl font-bold tracking-tight text-gold-gradient">CANTERA</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[#A1C4FD] hidden md:inline">{t('ref.system_online')}</span>
          </div>
          <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'match_center' && (
            <motion.div key="mc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <h2 className="text-2xl font-bold text-[#D4AF37]">{t('ref.match_center')}</h2>
              
              {/* Next Match Card */}
              <div className="p-6 rounded-2xl border border-[#2A2A2A] bg-white/[0.02] backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#A1C4FD]" />
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-xs text-[#A1C4FD] uppercase tracking-widest mb-1 font-mono">{t('ref.next_assignment')}</p>
                    <h3 className="text-xl font-bold">Real Madrid U19 vs FC Barcelona U19</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono text-[#A1C4FD]">14:00</p>
                    <p className="text-sm text-gray-500">Today, Estadio Alfredo Di Stefano</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setMatchStatus('LIVE'); setActiveTab('live_console'); }}
                  className="w-full py-4 bg-[#D4AF37] text-[#121212] font-bold rounded-xl hover:bg-[#b5952f] transition-colors flex justify-center items-center gap-2"
                >
                  <Play size={20} /> {t('ref.initialize')}
                </button>
              </div>

              {/* Agenda */}
              <div>
                <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-4">{t('ref.upcoming')}</h3>
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="p-4 rounded-xl border border-[#2A2A2A] flex justify-between items-center opacity-50">
                      <div>
                        <p className="font-medium">Atletico Madrid U19 vs Getafe U19</p>
                        <p className="text-xs text-gray-500">Tomorrow, 16:00</p>
                      </div>
                      <Calendar size={18} className="text-gray-500" />
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

              {/* Action Grid (High Contrast) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => handleAddEvent('GOAL')} className="h-24 rounded-xl border border-[#2A2A2A] bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">G</div>
                  <span className="text-sm font-medium">{t('ref.goal')}</span>
                </button>
                <button onClick={() => handleAddEvent('YELLOW_CARD')} className="h-24 rounded-xl border border-[#2A2A2A] bg-white/[0.02] hover:bg-[#eab308]/10 flex flex-col items-center justify-center gap-2 transition-colors">
                  <div className="w-6 h-8 bg-[#eab308] rounded-sm" />
                  <span className="text-sm font-medium">{t('ref.yellow_card')}</span>
                </button>
                <button onClick={() => handleAddEvent('RED_CARD')} className="h-24 rounded-xl border border-[#2A2A2A] bg-white/[0.02] hover:bg-red-500/10 flex flex-col items-center justify-center gap-2 transition-colors">
                  <div className="w-6 h-8 bg-red-500 rounded-sm" />
                  <span className="text-sm font-medium">{t('ref.red_card')}</span>
                </button>
                <button onClick={() => handleAddEvent('SUBSTITUTION')} className="h-24 rounded-xl border border-[#2A2A2A] bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2 transition-colors">
                  <Activity size={24} className="text-[#A1C4FD]" />
                  <span className="text-sm font-medium">{t('ref.substitution')}</span>
                </button>
              </div>

              {/* Event Log */}
              <div className="p-6 rounded-xl border border-[#2A2A2A] bg-white/[0.01] min-h-[200px]">
                <h3 className="text-sm text-gray-500 uppercase tracking-widest mb-4">{t('ref.match_log')}</h3>
                <div className="space-y-3">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center gap-4 text-sm border-b border-[#2A2A2A] pb-2">
                      <span className="font-mono text-[#A1C4FD] w-12">{ev.time}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        ev.type === 'GOAL' ? "bg-white text-black" :
                        ev.type === 'YELLOW_CARD' ? "bg-[#eab308] text-black" :
                        ev.type === 'RED_CARD' ? "bg-red-500 text-white" : "bg-[#A1C4FD] text-black"
                      )}>{t(`ref.${ev.type.toLowerCase()}`)}</span>
                      <span>{ev.playerName}</span>
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-gray-600 italic text-sm">{t('ref.no_events')}</p>}
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
              <h2 className="text-2xl font-bold text-[#D4AF37]">{t('ref.evaluation')}</h2>
              <p className="text-sm text-gray-400">{t('ref.generate_report')}</p>
              
              <div className="space-y-4">
                {MOCK_PLAYERS.map(player => (
                  <EvaluationCard key={player.id} player={player} />
                ))}
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
      <div className="fixed bottom-0 w-full bg-[#121212]/95 backdrop-blur-xl border-t border-[#2A2A2A] z-40">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <NavBtn icon={<Calendar />} label={t('ref.match_center')} active={activeTab === 'match_center'} onClick={() => setActiveTab('match_center')} />
          <NavBtn icon={<Clock />} label={t('ref.live_console')} active={activeTab === 'live_console'} onClick={() => setActiveTab('live_console')} disabled={matchStatus === 'SCHEDULED'} />
          <NavBtn icon={<CheckCircle />} label={t('ref.evaluation')} active={activeTab === 'evaluation'} onClick={() => setActiveTab('evaluation')} disabled={matchStatus !== 'COMPLETED'} />
          <NavBtn icon={<FileSignature />} label={t('ref.integrity')} active={activeTab === 'integrity'} onClick={() => setActiveTab('integrity')} />
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
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-colors",
        active ? "text-[#D4AF37]" : "text-gray-600 hover:text-gray-400",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function EvaluationCard({ player }: { player: any; key?: string }) {
  const [tech, setTech] = useState(80);
  const [fair, setFair] = useState(80);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = () => {
    finishMatchAndEvaluate(player.id, tech, fair);
    setSubmitted(true);
  };

  return (
    <div className="p-6 rounded-xl border border-[#2A2A2A] bg-white/[0.02]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center"><User size={20} /></div>
          <div>
            <p className="font-bold">{player.name}</p>
            <p className="text-xs text-[#A1C4FD] font-mono">{player.position} • {player.team}</p>
          </div>
        </div>
        {submitted && <span className="text-xs font-bold text-[#D4AF37] border border-[#D4AF37] px-2 py-1 rounded">{t('ref.validated')}</span>}
      </div>

      {!submitted ? (
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{t('ref.technical')}</span>
              <span className="font-mono text-[#A1C4FD]">{tech}/100</span>
            </div>
            <input type="range" min="0" max="100" value={tech} onChange={(e) => setTech(Number(e.target.value))} className="w-full accent-[#A1C4FD]" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">{t('ref.fairplay')}</span>
              <span className="font-mono text-[#A1C4FD]">{fair}/100</span>
            </div>
            <input type="range" min="0" max="100" value={fair} onChange={(e) => setFair(Number(e.target.value))} className="w-full accent-[#A1C4FD]" />
          </div>
          <button 
            onClick={handleSubmit}
            className="w-full py-3 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-sm font-bold hover:bg-[#D4AF37]/20 transition-colors"
          >
            {t('ref.submit')}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-400 text-sm">
          <CheckCircle size={18} /> {t('ref.report_generated')}
        </div>
      )}
    </div>
  );
}
