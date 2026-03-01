import { motion } from 'framer-motion';
import { Package, ShieldCheck, Zap, Heart } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[400px] h-[400px] bg-accent-600/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm z-10 flex flex-col items-center gap-12"
            >
                {/* Logo */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center text-white shadow-2xl shadow-primary-500/20 rotate-3">
                        <Package size={40} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black text-white tracking-tighter">Stock<span className="text-primary-400">Sense</span></h1>
                        <p className="text-slate-400 font-medium text-sm mt-2">Elite Household Inventory Management</p>
                    </div>
                </div>

                {/* Features Preview */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                        { icon: ShieldCheck, text: 'Real-time Sync', color: 'text-emerald-400' },
                        { icon: Zap, text: 'Smart Alerts', color: 'text-orange-400' },
                        { icon: Heart, text: 'Family Shared', color: 'text-accent-400' },
                        { icon: Package, text: 'Multi-Family', color: 'text-primary-400' },
                    ].map((feature, i) => (
                        <div key={i} className="glass p-3 rounded-2xl flex items-center gap-3 border-slate-700/30">
                            <feature.icon size={16} className={feature.color} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* Login Button */}
                <div className="w-full space-y-4">
                    <button
                        onClick={onLogin}
                        className="w-full bg-white text-slate-900 h-16 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-4"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        Sign in with Google
                    </button>
                    <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest px-8 leading-relaxed">
                        Personal data is stored securely in your own Google Drive.
                    </p>
                </div>
            </motion.div>

            {/* Footer Branding */}
            <div className="absolute bottom-10 text-center w-full">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">Designed for Modern Households</p>
            </div>
        </div>
    );
};

export default Login;
