import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, User, MessageSquare, Bell, Settings, 
  ChevronRight, CheckCircle2, XCircle, Clock, Eye,
  Lock, Unlock, ArrowUpRight, ShieldCheck, Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../core/i18n/LanguageContext';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';

type GuardianTab = 'oversight' | 'messages' | 'approvals';

export default function Cantera4GuardianDashboard() {
  const [activeTab, setActiveTab] = useState<GuardianTab>('oversight');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const children = [
    { id: 'PLY-8472', name: 'Mateo Silva', age: 18, position: 'CM', team: 'Real Madrid Academy', status: 'Active', image: 'https://picsum.photos/seed/player1/100/100' }
  ];

  const approvals = [
    { id: 1, scout: 'Scout Arsenal F.C.', player: 'Mateo Silva', type: 'Direct Contact', date: '2 hours ago', status: 'pending' },
    { id: 2, scout: 'Scout Manchester City', player: 'Mateo Silva', type: 'Data Access', date: '1 day ago', status: 'approved' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal text-charcoal dark:text-white font-sans selection:bg-gold/30 pb-32 transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-charcoal/90 backdrop-blur-md border-b border-border-subtle px-6 py-4 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-4">
          <BackButton />
          <div className="flex items-center gap-3">
            <Shield className="text-emerald-500" size={24} />
            <Logo size="md" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/settings')} className="text-charcoal/40 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('c1.role.guardian')} Oversight</h1>
          <p className="text-sm text-gray-500">Protecting and managing the professional future of your children.</p>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'oversight' && (
            <motion.div key="oversight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              
              {/* Action Required Alert */}
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-600 dark:text-amber-500">Action Required: Contact Request</h3>
                    <p className="text-sm text-charcoal/70 dark:text-gray-300">Scout Arsenal F.C. has requested to view Mateo's contact information.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('approvals')} className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors whitespace-nowrap">
                  Review Request
                </button>
              </div>

              {/* Children List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {children.map(child => (
                  <div key={child.id} className="p-6 rounded-3xl bg-black/5 dark:bg-white/[0.02] border border-border-subtle flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/30">
                        <img src={child.image} alt={child.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{child.name}</h3>
                        <p className="text-xs text-gray-500">{child.position} • {child.team}</p>
                      </div>
                      <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase">
                        {child.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Scout Views</p>
                        <p className="text-2xl font-bold">128</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Contact Req.</p>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate(`/player/${child.id}`)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      View Full Profile <ArrowUpRight size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Security Status */}
              <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Privacy Shield Active</h3>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                      All direct communications from scouts are currently being intercepted for your review. 
                      No personal contact information is visible to unverified scouts.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'approvals' && (
            <motion.div key="approvals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold">Pending Approvals</h2>
              <div className="space-y-4">
                {approvals.map(app => (
                  <div key={app.id} className="p-6 rounded-2xl border border-border-subtle bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-bold">{app.scout}</p>
                        <p className="text-xs text-gray-500">{app.type} • {app.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      {app.status === 'pending' ? (
                        <>
                          <button className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} /> Approve
                          </button>
                          <button className="flex-1 md:flex-none px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                            <XCircle size={16} /> Deny
                          </button>
                        </>
                      ) : (
                        <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 size={16} /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/80 dark:bg-charcoal/80 backdrop-blur-xl border border-border-subtle/50 rounded-full shadow-2xl z-50 px-2 py-2 transition-all duration-300">
        <div className="flex justify-around items-center h-14">
          <NavBtn icon={<Eye />} label={t('nav.oversight')} active={activeTab === 'oversight'} onClick={() => setActiveTab('oversight')} />
          <NavBtn icon={<Bell />} label={t('nav.approvals')} active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} />
          <NavBtn icon={<MessageSquare />} label={t('nav.inbox')} active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
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
        "flex flex-col items-center justify-center gap-0.5 px-6 py-1 rounded-full transition-all duration-300",
        active ? "text-emerald-500 bg-emerald-500/10 scale-110" : "text-charcoal/60 dark:text-gray-600 hover:text-charcoal/80 dark:hover:text-gray-400"
      )}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
