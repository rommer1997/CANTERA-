import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Info, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useAppStore, Notification } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'error': return <X className="text-red-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm h-full bg-white dark:bg-charcoal shadow-2xl flex flex-col border-l border-border-subtle"
        >
          <div className="p-6 border-b border-border-subtle flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="bg-gold text-black text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  {unreadCount} <Bell size={10} fill="currentColor" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-gold hover:underline transition-all"
                >
                  Marcar todas como leídas
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <Bell size={48} className="mb-4" />
                <p className="text-sm font-medium">No tienes notificaciones</p>
                <p className="text-xs">Te avisaremos cuando pase algo importante.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer relative group",
                    n.read 
                      ? "bg-transparent border-border-subtle opacity-60" 
                      : "bg-black/5 dark:bg-white/5 border-gold/20 shadow-sm"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">{getIcon(n.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold leading-tight">{n.title}</h4>
                        <span className="text-[10px] text-charcoal/40 dark:text-ice/40 font-medium">{n.time}</span>
                      </div>
                      <p className="text-xs text-charcoal/60 dark:text-ice/60 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                  {!n.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-gold rounded-full" />
                  )}
                </motion.div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-border-subtle">
              <button 
                onClick={clearNotifications}
                className="w-full py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Borrar todas
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
