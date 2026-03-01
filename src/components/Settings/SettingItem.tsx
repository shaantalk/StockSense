import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { ElementType } from 'react';

interface SettingItemProps {
    icon: ElementType;
    label: string;
    value?: string;
    color: string;
    onClick?: () => void;
    delay?: number;
}

export const SettingItem = ({ icon: Icon, label, value, color, onClick, delay = 0 }: SettingItemProps) => (
    <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        onClick={onClick}
        className="glass p-5 rounded-3xl flex items-center justify-between group cursor-pointer hover:border-slate-600 transition-all border-slate-700/50"
    >
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} shadow-inner`}>
                <Icon size={20} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-white uppercase tracking-wider">{label}</span>
                {value && <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{value}</span>}
            </div>
        </div>
        <ChevronRight size={18} className="text-slate-700 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
    </motion.div>
);
