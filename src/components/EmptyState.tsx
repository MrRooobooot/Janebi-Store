import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionLink?: string;
  onActionClick?: () => void;
  className?: string;
}

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  actionText, 
  actionLink, 
  onActionClick,
  className = "linear-card bg-white dark:bg-white/[0.025] rounded-3xl p-8 sm:p-12 shadow-sm border border-zinc-200/80 dark:border-white/[0.08] min-h-[45vh]"
}: EmptyStateProps) {
  return (
    <div className={`${className} flex flex-col items-center justify-center text-center transition-colors select-none`}>
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 sm:w-24 sm:h-24 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-6 border border-orange-100/80 dark:border-orange-900/40 shadow-inner"
      >
        {icon}
      </motion.div>
      <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mb-3 tracking-tight">{title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed font-medium">{description}</p>
      
      {actionLink && actionText && (
        <Link 
          to={actionLink} 
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl transition-all inline-flex items-center justify-center min-touch-target shadow-md shadow-orange-500/20 active:scale-95 raycast-btn"
        >
          {actionText}
        </Link>
      )}

      {onActionClick && actionText && !actionLink && (
        <button 
          onClick={onActionClick} 
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl transition-all inline-flex items-center justify-center min-touch-target shadow-md shadow-orange-500/20 active:scale-95 raycast-btn"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
