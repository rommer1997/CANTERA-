import React, { useState } from 'react';
import { 
  Search, Filter, Star, MapPin, ShieldCheck, 
  ChevronRight, SlidersHorizontal, ArrowUpRight,
  LayoutGrid, ListTodo, MessageSquare, UserCircle, Settings, Trophy, Plus, Briefcase, Clock, CheckCircle2, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MOCK_OPPORTUNITIES, Opportunity } from '../core/domain';
import { useLanguage } from '../core/i18n/LanguageContext';
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
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=400&h=400&auto=format&fit=crop", 
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
    image: "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=400&h=400&auto=format&fit=crop", 
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
    image: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=400&h=400&auto=format&fit=crop", 
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
    image: "https://images.unsplash.com/photo-1551280857-2b9bbe5240f5?q=80&w=400&h=400&auto=format&fit=crop", 
    topTraits: ["Finishing", "Positioning"],
    status: "new"
  },
];

export default function Cantera3ScoutDashboard() {
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans pb-20 md:pb-0 md:pl-20">
      
      {/* --- DESKTOP SIDEBAR / MOBILE BOTTOM NAV --- */}
      <nav className="fixed bottom-0 w-full bg-[#121212]/90 backdrop-blur-md border-t border-white/10 z-50 md:left-0 md:top-0 md:w-20 md:h-full md:border-t-0 md:border-r flex md:flex-col justify-around md:justify-start md:pt-8 items-center p-4 md:gap-8">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'discover' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <LayoutGrid size={24} />
          <span className="text-[10px] uppercase tracking-wider md:hidden">{t('s3.discover')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('shortlist')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'shortlist' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <ListTodo size={24} />
          <span className="text-[10px] uppercase tracking-wider md:hidden">{t('s3.pipeline')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'messages' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <MessageSquare size={24} />
          <span className="text-[10px] uppercase tracking-wider md:hidden">{t('s3.inbox')}</span>
        </button>
        <button 
          onClick={() => setActiveTab('opportunities')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'opportunities' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Trophy size={24} />
          <span className="text-[10px] uppercase tracking-wider md:hidden">{t('s3.events')}</span>
        </button>
        <div className="md:mt-auto md:mb-8">
          <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
            <UserCircle size={24} />
            <span className="text-[10px] uppercase tracking-wider md:hidden">{t('s3.profile')}</span>
          </button>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-5xl mx-auto p-6">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gold-gradient">{t('s3.title')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('s3.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">Arsenal F.C.</p>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-[10px] text-gold font-bold">€2.5M {t('s3.portfolio')}</p>
                <div className="px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-[8px] font-black tracking-tighter">
                  {t('tier.diamond')}
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center">
              <ShieldCheck size={20} className="text-[#D4AF37]" />
            </div>
            <button onClick={() => navigate('/settings')} className="text-gray-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder={t('s3.search')}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#1A1A1A] border border-white/10 rounded-xl py-3 px-6 hover:bg-white/5 transition-colors"
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

        {/* Tab Content: Discover */}
        {activeTab === 'discover' && (
          <div className="space-y-8">
            
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Search size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">1,248</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('s3.stats.total_scouted')}</p>
                </div>
              </div>
              <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ListTodo size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">42</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('s3.stats.shortlisted')}</p>
                </div>
              </div>
              <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">3</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t('s3.stats.active_events')}</p>
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
                <div key={player.id} className="group bg-[#121212] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300">
                  {/* Card Header / Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={player.image} 
                      alt={player.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent" />
                    
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
          </div>
        )}

        {/* Tab Content: Opportunities */}
        {activeTab === 'opportunities' && (
          <div className="space-y-8">
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
              {MOCK_OPPORTUNITIES.filter(opp => opp.creator.id === 'SCT-999').map(opp => (
                <div key={opp.id} className="bg-[#121212] border border-white/5 rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-2">
                      <span className="w-fit bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold px-2.5 py-1 rounded border border-[#D4AF37]/20 uppercase tracking-widest">
                        {opp.type}
                      </span>
                      <h3 className="text-xl font-bold group-hover:text-[#D4AF37] transition-colors">{opp.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-mono">{opp.date}</p>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter mt-1">{t('s3.active')}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-8 line-clamp-2 leading-relaxed">{opp.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('s3.applicants')}</p>
                      <p className="text-lg font-bold text-white">{opp.applicants.length + 12}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('s3.views')}</p>
                      <p className="text-lg font-bold text-white">1.2K</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[
                          "https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=40&h=40&auto=format&fit=crop",
                          "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=40&h=40&auto=format&fit=crop",
                          "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?q=80&w=40&h=40&auto=format&fit=crop"
                        ].map((img, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-[#121212] overflow-hidden">
                            <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">+{9} {t('s3.more')}</span>
                    </div>
                    <button className="text-[#D4AF37] text-sm font-bold hover:underline flex items-center gap-1 group/btn">
                      {t('s3.manage_applicants')} <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
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
          </div>
        )}
        {activeTab === 'shortlist' && (
          <div className="space-y-6">
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
                  
                  <div className="space-y-4 min-h-[500px] bg-[#121212]/50 rounded-2xl p-3 border border-white/5">
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
          </div>
        )}

      </main>

      <FilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} t={t} />
    </div>
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
          className="w-full max-w-sm h-full bg-[#121212] border-l border-white/10 flex flex-col"
        >
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{t('s3.advanced_filters')}</h3>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Age */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.age')}</label>
              <div className="flex items-center gap-4">
                <input type="number" placeholder="Min" className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                <span className="text-gray-500">-</span>
                <input type="number" placeholder="Max" className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">{t('s3.filter.position')}</label>
              <div className="flex flex-wrap gap-2">
                {['GK', 'DEF', 'MID', 'FWD'].map(pos => (
                  <button key={pos} className="px-4 py-2 rounded-lg border border-white/10 bg-[#1A1A1A] text-sm hover:border-[#D4AF37]/50 transition-colors">
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
                  <label key={tier} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-[#1A1A1A] cursor-pointer hover:border-[#D4AF37]/30 transition-colors">
                    <input type="checkbox" className="accent-[#D4AF37] w-4 h-4" />
                    <span className="text-sm">{t(`tier.${tier.toLowerCase()}`)}</span>
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
