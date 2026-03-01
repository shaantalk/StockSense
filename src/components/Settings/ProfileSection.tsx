import type { UserConfig } from '../../types';

interface ProfileSectionProps {
    config: UserConfig | null;
}

export const ProfileSection = ({ config }: ProfileSectionProps) => {
    return (
        <section className="relative px-2">
            <div className="absolute inset-0 bg-primary-600/5 blur-3xl rounded-full" />
            <div className="relative glass p-6 rounded-[2.5rem] border-slate-700/50 flex flex-col items-center gap-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
                <div className="w-24 h-24 rounded-full border-4 border-slate-800 p-1 shadow-2xl">
                    <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(config?.currentUser?.name || 'U')}&background=0ea5e9&color=fff&size=128`}
                        alt="Profile"
                        className="w-full h-full rounded-full shadow-inner"
                    />
                </div>
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">{config?.currentUser?.name}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">{config?.currentUser?.email}</p>
                </div>
            </div>
        </section>
    );
};
