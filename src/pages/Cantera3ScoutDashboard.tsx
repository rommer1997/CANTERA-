import React, { useState } from 'react';
import { 
  Search, Filter, Star, MapPin, ShieldCheck, 
  ChevronRight, SlidersHorizontal, ArrowUpRight,
  LayoutGrid, ListTodo, MessageSquare, UserCircle, Settings, Trophy, Plus, Briefcase, Clock, CheckCircle2, X, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MOCK_OPPORTUNITIES, Opportunity } from '../core/domain';
import { useLanguage } from '../core/i18n/LanguageContext';
import Logo from '../components/Logo';
import BackButton from '../components/BackButton';
import NotificationCenter from '../components/NotificationCenter';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK DATA ---
const MOCK_PLAYERS = [
  { 
    id: 1, 
    name: "Mateo Silva", 
    age: 18, 
    position: "CAM", 
    nationality: "ESP", 
    rating: 84, 
    verified: true, 
    tier: 'DIAMOND_PRO',
    years: 4,
    validations: 128,
    image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=400&auto=format&fit=crop", 
    topTraits: ["Vision", "Passing"],
    status: "scouted"
  },
  { 
    id: 2, 
    name: "Liam O'Connor", 
    age: 19, 
    position: "CB", 
    nationality: "ENG", 
    rating: 81, 
    verified: true, 
    tier: 'DIAMOND',
    years: 3,
    validations: 85,
    image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=400&auto=format&fit=crop", 
    topTraits: ["Tackling", "Strength"],
    status: "shortlisted"
  },
  { 
    id: 3, 
    name: "Kofi Mensah", 
    age: 17, 
    position: "RW", 
    nationality: "GHA", 
    rating: 86, 
    verified: false, 
    tier: 'NONE',
    years: 1,
    validations: 12,
    image: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?q=80&w=400&auto=format&fit=crop", 
    topTraits: ["Pace", "Dribbling"],
    status: "new"
  },
  { 
    id: 4, 
    name: "Lucas Rossi", 
    age: 16, 
    position: "ST", 
    nationality: "ITA", 
    rating: 79, 
    verified: true, 
    tier: 'GOLD',
    years: 2,
    validations: 45,
    image: "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=400&auto=format&fit=crop", 
    topTraits: ["Finishing", "Positioning"],
    status: "new"
  },
];

export default function Cantera3ScoutDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-charcoal text-charcoal dark:text-ice font-sans pb-20 md:pb-0 md:pl-20 transition-colors duration-300">
      
      {/* --- DESKTOP SIDEBAR / MOBILE BOTTOM NAV --- */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/80 dark:bg-charcoal/80 backdrop-blur-xl border border-border-subtle/50 rounded-full shadow-2xl z-50 px-2 py-2 flex md:flex-col justify-around md:justify-start md:pt-8 items-center md:gap-8 transition-all duration-300 md:bottom-auto md:left-0 md:top-0 md:w-20 md:h-full md:rounded-none md:translate-x-0 md:border-r md:border-t-0 md:bg-white/90 md:dark:bg-charcoal/90">
        <NavBtn 
          icon={<LayoutGrid size={24} />} 
          label={t('nav.dash')} 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
        />
        <NavBtn 
          icon={<Search size={24} />} 
          label={t('nav.scout')} 
          active={activeTab === 'discover'} 
          onClick={() => setActiveTab('discover')} 
        />
        <NavBtn 
          icon={<ListTodo size={24} />} 
          label={t('nav.pipe')} 
          active={activeTab === 'shortlist'} 
          onClick={() => setActiveTab('shortlist')} 
        />
        <NavBtn 
          icon={<MessageSquare size={24} />} 
          label={t('nav.inbox')} 
          active={activeTab === 'messages'} 
          onClick={() => setActiveTab('messages')} 
        />
        <NavBtn 
          icon={<Trophy size={24} />} 
          label={t('nav.events')} 
          active={activeTab === 'opportunities'} 
          onClick={() => setActiveTab('opportunities')} 
        />
        <div className="md:mt-auto md:mb-8">
          <NavBtn 
            icon={<UserCircle size={24} />} 
            label={t('nav.profile')} 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-5xl mx-auto p-6">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pt-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <Logo size="lg" />
              <p className="text-sm text-charcoal/40 dark:text-gray-400 mt-1">{t('s3.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-charcoal dark:text-white">Arsenal F.C.</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-[10px] text-gold font-bold">€2.5M {t('s3.portfolio')}</p>
                <div className="px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-[8px] font-black tracking-tighter">
                  {t('tier.diamond')}
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 border border-border-subtle flex items-center justify-center">
              <ShieldCheck size={20} className="text-[#D4AF37]" />
            </div>
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative text-charcoal/40 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white dark:border-charcoal flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/settings', { 
              state: { 
                user: {
                  name: 'Scout Arsenal F.C.',
                  email: 'scout@arsenal.com',
                  role: 'SCOUT',
                  bio: 'Head of Youth Recruitment @ Arsenal F.C. | Searching for the next generation of global talent.',
                  avatar: 'https://picsum.photos/seed/scout1/200/200',
                  plan: 'ENTERPRISE PLAN'
                }
              }
            })} className="text-charcoal/40 dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40 dark:text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder={t('s3.search')}
              className="w-full bg-black/5 dark:bg-[#1A1A1A] border border-border-subtle rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-charcoal dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center justify-center gap-2 bg-black/5 dark:bg-[#1A1A1A] border border-border-subtle rounded-xl py-3 px-6 hover:bg-black/10 dark:hover:bg-white/5 transition-colors text-charcoal dark:text-white"
          >
            <SlidersHorizontal size={18} />
            <span className="text-sm font-medium">{t('s3.filters')}</span>
          </button>
        </div>

        {/* Quick Filters (Chips) */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {[
            { id: 'all', label: t('s3.all') },
            { id: 'u19', label: 'U19' },
            { id: 'u17', label: 'U17' },
            { id: 'midfielders', label: t('s3.midfielders') },
            { id: 'pro', label: t('s3.pro_verified') },
            { id: 'available', label: t('s3.available') }
          ].map((filter, i) => (
            <button 
              key={filter.id}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                i === 0 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                  : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && <ScreenDashboard t={t} />}
          
          {activeTab === 'discover' && (
            <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Dashboard Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-black/5 dark:bg-charcoal border border-border-subtle rounded-2xl p-5 flex items-center gap-4 hover:border-charcoal/20 dark:hover:border-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Search size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-charcoal dark:text-white">1,248</p>
                    <p className="text-xs text-charcoal/50 dark:text-gray-500 uppercase tracking-wider">{t('s3.stats.total_scouted')}</p>
                  </div>
                </div>
                <div className="bg-black/5 dark:bg-charcoal border border-border-subtle rounded-2xl p-5 flex items-center gap-4 hover:border-charcoal/20 dark:hover:border-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <ListTodo size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-charcoal dark:text-white">42</p>
                    <p className="text-xs text-charcoal/50 dark:text-gray-500 uppercase tracking-wider">{t('s3.stats.shortlisted')}</p>
                  </div>
                </div>
                <div className="bg-black/5 dark:bg-charcoal border border-border-subtle rounded-2xl p-5 flex items-center gap-4 hover:border-charcoal/20 dark:hover:border-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-charcoal dark:text-white">3</p>
                    <p className="text-xs text-charcoal/50 dark:text-gray-500 uppercase tracking-wider">{t('s3.stats.active_events')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <h2 className="text-lg font-medium">{t('s3.rec_for_you')}</h2>
                  <button className="text-xs text-[#D4AF37] hover:underline">{t('s3.view_all')}</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {MOCK_PLAYERS.map((player) => (
                    <div key={player.id} className="group bg-white dark:bg-charcoal border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden hover:border-gold/20 transition-all duration-300">
                      {/* Card Header / Image */}
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={player.image} 
                          alt={player.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-charcoal via-transparent to-transparent" />
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className="w-fit bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold tracking-wider border border-white/10">
                            {player.position}
                          </span>
                          {player.verified && (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded border text-[8px] font-black tracking-tighter shadow-lg",
                              player.tier === 'DIAMOND_PRO' ? "bg-gradient-to-br from-cyan-400 via-purple-500 to-gold text-white border-white/30" :
                              player.tier === 'DIAMOND' ? "bg-cyan-400/20 text-cyan-400 border-cyan-400/30" :
                              "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                            )}>
                              <ShieldCheck size={10} className={player.tier === 'DIAMOND_PRO' ? 'fill-white/20' : ''} />
                              <span>{t(`tier.${player.tier.toLowerCase()}`)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Rating */}
                        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center border border-[#D4AF37]/30">
                          <span className="text-[#D4AF37] font-bold text-sm">{player.rating}</span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">{player.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                              <MapPin size={12} />
                              <span>{player.nationality} • {player.age} {t('c2.cv.age').toLowerCase()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Traits */}
                        <div className="flex flex-wrap gap-2 mb-6">
                          {player.topTraits.map(trait => (
                            <span key={trait} className="text-[10px] uppercase tracking-wider px-2 py-1 bg-white/5 rounded text-gray-300">
                              {trait}
                            </span>
                          ))}
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-gold/10 rounded text-gold border border-gold/20 flex items-center gap-1">
                            <Clock size={10} /> {player.years}{t('s3.reach')}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <button className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                            {t('s3.shortlist')}
                          </button>
                          <button className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028] text-black py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            {t('s3.profile')} <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'opportunities' && (
            <motion.div key="opportunities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{t('s3.opp_hub')}</h2>
                  <p className="text-sm text-gray-500">{t('s3.opp_desc')}</p>
                </div>
                <button className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.2)]">
                  <Plus size={20} /> {t('s3.create_event')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {MOCK_OPPORTUNITIES.map(opp => (
                  <div key={opp.id} className="bg-white dark:bg-charcoal border border-gray-200 dark:border-white/5 rounded-2xl p-6 hover:border-gold/30 transition-all group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-white/5 text-gold font-bold text-sm shadow-inner overflow-hidden shrink-0">
                          {opp.creator.logo ? (
                            <img 
                              src={opp.creator.logo} 
                              alt={opp.creator.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            opp.creator.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-fit bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-2.5 py-1 rounded border border-[#D4AF37]/20 uppercase tracking-widest shrink-0">
                              {opp.type}
                            </span>
                            {opp.creator.id === 'SCT-999' && (
                              <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter shrink-0">
                                {t('s3.my_event')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold group-hover:text-[#D4AF37] transition-colors line-clamp-2 leading-tight" title={opp.title}>{opp.title}</h3>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500 font-mono">{opp.date}</p>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter mt-1">{t('s3.active')}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-charcoal/60 dark:text-gray-400 mb-8 line-clamp-2 leading-relaxed flex-1">{opp.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('s3.applicants')}</p>
                        <p className="text-lg font-bold text-charcoal dark:text-white">{opp.applicants.length + (opp.creator.id === 'SCT-999' ? 12 : 0)}</p>
                      </div>
                      <div className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('s3.views')}</p>
                        <p className="text-lg font-bold text-charcoal dark:text-white">{opp.creator.id === 'SCT-999' ? '1.2K' : '850'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[
                            "https://picsum.photos/seed/avatar1/40/40",
                            "https://picsum.photos/seed/avatar2/40/40",
                            "https://picsum.photos/seed/avatar3/40/40"
                          ].map((img, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-charcoal overflow-hidden">
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">+{opp.creator.id === 'SCT-999' ? 9 : 4} {t('s3.more')}</span>
                      </div>
                      <button className="text-[#D4AF37] text-sm font-bold hover:underline flex items-center gap-1 group/btn">
                        {opp.creator.id === 'SCT-999' ? t('s3.manage_applicants') : t('s3.view_details')} <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin/Staff Section */}
              <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 max-w-2xl">
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <ShieldCheck size={24} className="text-[#D4AF37]" /> {t('s3.auth_events')}
                  </h3>
                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    {t('s3.auth_desc')}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 size={16} className="text-emerald-500" /> {t('s3.admin_approval')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 size={16} className="text-emerald-500" /> {t('s3.verified_pool')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle2 size={16} className="text-emerald-500" /> {t('s3.crm_integration')}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shortlist' && (
            <motion.div key="shortlist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">{t('s3.pipeline_mgmt')}</h2>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      setIsCompareMode(!isCompareMode);
                      if (isCompareMode) setCompareList([]);
                    }}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border",
                      isCompareMode 
                        ? "bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#C5A028]" 
                        : "text-white bg-white/5 border-white/10 hover:bg-white/10"
                    )}
                  >
                    <LayoutGrid size={14} /> {isCompareMode ? t('s3.cancel_compare') : t('s3.compare')}
                  </button>
                  <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <SlidersHorizontal size={14} /> {t('s3.advanced_filters')}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
                {['new', 'scouted', 'shortlisted', 'contacted'].map((status) => (
                  <div key={status} className="min-w-[280px] flex-1 snap-center">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                        {t(`s3.kanban.${status}`)}
                      </h3>
                      <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                        {MOCK_PLAYERS.filter(p => p.status === status).length}
                      </span>
                    </div>
                    
                    <div className="space-y-4 min-h-[500px] bg-black/5 dark:bg-charcoal/50 rounded-2xl p-3 border border-gray-200 dark:border-white/5">
                      {MOCK_PLAYERS.filter(p => p.status === status).map((player) => (
                        <div key={player.id} className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 hover:border-[#D4AF37]/50 transition-colors cursor-grab active:cursor-grabbing">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <img src={player.image} alt={player.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-medium text-sm flex items-center gap-1">
                                  {player.name}
                                  {player.verified && (
                                    <ShieldCheck 
                                      size={12} 
                                      className={cn(
                                        player.tier === 'DIAMOND_PRO' ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" :
                                        player.tier === 'DIAMOND' ? "text-cyan-400" :
                                        "text-[#D4AF37]"
                                      )} 
                                    />
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-500">{player.position} • {player.age} {t('c2.cv.age').toLowerCase()}</p>
                              </div>
                            </div>
                            <div className="bg-black/50 px-2 py-1 rounded border border-white/5">
                              <span className="text-[#D4AF37] font-bold text-xs">{player.rating}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {player.topTraits.slice(0, 2).map(trait => (
                              <span key={trait} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-white/5 rounded text-gray-400">
                                {trait}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <MapPin size={10} /> {player.nationality}
                            </span>
                            <button className="text-gray-400 hover:text-[#D4AF37] transition-colors">
                              <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} t={t} />
      <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}

function ScreenDashboard({ t }: { t: (k: string) => string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline', value: '24', trend: '↑3', icon: <ListTodo size={18} />, color: 'text-blue-500' },
          { label: 'Unlocked', value: '8', trend: 'Active', icon: <ShieldCheck size={18} />, color: 'text-emerald-500' },
          { label: 'Portfolio', value: '€2.5M', trend: 'Elite', icon: <Briefcase size={18} />, color: 'text-gold' },
          { label: 'Avg Rating', value: '83.2', trend: '↑0.5', icon: <Star size={18} />, color: 'text-purple-500' },
        ].map((kpi, i) => (
          <div key={i} className="glass-panel p-4 border-border-subtle/50">
            <div className={cn("p-2 rounded-lg bg-black/5 dark:bg-white/5 w-fit mb-3", kpi.color)}>
              {kpi.icon}
            </div>
            <p className="text-[10px] text-charcoal/50 dark:text-ice/50 uppercase font-bold tracking-wider">{kpi.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-xl font-bold">{kpi.value}</p>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5">
                {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { text: 'Mateo Silva ↑3 rating (84→87)', time: '2h ago', icon: <ArrowUpRight size={14} className="text-emerald-500" /> },
              { text: 'Kofi Mensah accepted trial inv.', time: '5h ago', icon: <CheckCircle2 size={14} className="text-blue-500" /> },
              { text: 'New match evaluated: Real vs Barca', time: 'Yesterday', icon: <Clock size={14} className="text-ice/40" /> },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5">{act.icon}</div>
                <div className="flex-1">
                  <p className="text-charcoal dark:text-ice">{act.text}</p>
                  <p className="text-[10px] text-charcoal/40 dark:text-ice/40">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Top Performers</h3>
          <div className="space-y-4">
            {MOCK_PLAYERS.slice(0, 3).map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <p className="text-sm font-bold">{p.name}</p>
                    <p className="text-[10px] text-charcoal/40 dark:text-ice/40">{p.position} • {p.nationality}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gold">{p.rating}</p>
                  <p className="text-[10px] text-emerald-500 font-bold">↑ 2.4%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NavBtn({ icon, label, active, onClick, disabled }: any) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-all duration-300",
        active ? "text-[#D4AF37] bg-gold/10 scale-110" : "text-charcoal/50 dark:text-gray-500 hover:text-charcoal dark:hover:text-gray-300",
        disabled && "opacity-20 cursor-not-allowed"
      )}
    >
      {React.cloneElement(icon, { size: 20 })}
      <span className="text-[9px] font-bold uppercase tracking-tighter md:hidden">{label}</span>
    </button>
  );
}

function FilterModal({ isOpen, onClose, t }: { isOpen: boolean, onClose: () => void, t: (k: string) => string }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm h-full bg-white dark:bg-charcoal border-l border-gray-200 dark:border-white/10 flex flex-col transition-colors duration-300"
        >
          <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-charcoal dark:text-white">{t('s3.advanced_filters')}</h3>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Age */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.age')}</label>
              <div className="flex items-center gap-4">
                <input type="number" placeholder="Min" className="w-full bg-black/5 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-charcoal dark:text-white focus:outline-none focus:border-gold/50 transition-colors" />
                <span className="text-gray-500">-</span>
                <input type="number" placeholder="Max" className="w-full bg-black/5 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-charcoal dark:text-white focus:outline-none focus:border-gold/50 transition-colors" />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.position')}</label>
              <div className="flex flex-wrap gap-2">
                {['GK', 'DEF', 'MID', 'FWD'].map(pos => (
                  <button key={pos} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-[#1A1A1A] text-sm text-charcoal dark:text-white hover:border-gold/50 transition-colors">
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.rating')}</label>
              <input type="range" min="0" max="100" className="w-full accent-[#D4AF37]" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>100</span>
              </div>
            </div>

            {/* Verification Tier */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.tier')}</label>
              <div className="space-y-2">
                {['GOLD', 'DIAMOND', 'DIAMOND_PRO'].map(tier => (
                  <label key={tier} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-[#1A1A1A] cursor-pointer hover:border-gold/30 transition-colors">
                    <input type="checkbox" className="accent-gold w-4 h-4" />
                    <span className="text-sm text-charcoal dark:text-white">{t(`tier.${tier.toLowerCase()}`)}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          
          <div className="p-6 border-t border-white/10 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-transparent border border-white/10 hover:bg-white/5 text-white font-medium transition-colors"
            >
              {t('s3.filter.reset')}
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-bold transition-colors"
            >
              {t('s3.filter.apply')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
