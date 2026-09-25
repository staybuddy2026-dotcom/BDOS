import { Globe, ChevronRight } from 'lucide-react';
import { ProviderCardData } from '@/features/providers/actions';

export type ProviderRegistryPanelProps = {
  providersList: ProviderCardData[];
  selectedProviderId: string;
  setSelectedProviderId: (id: string) => void;
  setPage: (page: number) => void;
  triggerNotification: (type: 'success' | 'error', msg: string) => void;
};

export function ProviderRegistryPanel({
  providersList,
  selectedProviderId,
  setSelectedProviderId,
  setPage,
  triggerNotification
}: ProviderRegistryPanelProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_2px_8px_rgba(99,102,241,0.3)]">
            <Globe size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-[1.2rem] font-semibold text-slate-800 m-0 tracking-[-0.01em]">
              Provider Registry — Universal Lead Providers ({providersList.length || 4} Available)
            </h3>
            <span className="text-[0.8rem] text-slate-400 font-medium">
              Click a provider card to switch prospecting context
            </span>
          </div>
        </div>
        <span className="text-[0.72rem] text-emerald-500 font-bold bg-emerald-50 py-1.5 px-3 rounded-full flex items-center gap-1.5 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Provider Framework Active
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        {providersList.map((p) => {
          const isSelected = selectedProviderId === p.id;
          const isLive = p.isLive === true && p.status === 'Connected';

          let IconStr = "A";
          let iconBg = "#6366f1"; // Matches sidebar accent
          let iconColor = "#ffffff";

          if (p.id === 'linkedin') { IconStr = "in"; iconBg = "#0284c7"; }
          if (p.id === 'crunchbase') { IconStr = "cb"; iconBg = "#1d4ed8"; }
          if (p.id === 'github') { IconStr = "gh"; iconBg = "#0f172a"; }

          return (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProviderId(p.id);
                setPage(1);
                triggerNotification('success', `Switched Lead Intelligence Hub context to ${p.name}.`);
              }}
              className={`apollo-provider-card ${isSelected ? 'active' : ''}`}
            >
              {/* Left Icon Block */}
              <div
                className="w-[46px] h-[46px] rounded-[10px] flex items-center justify-center text-[1.35rem] font-extrabold shrink-0 tracking-[-0.02em] self-center"
                style={{ background: iconBg, color: iconColor, boxShadow: `0 4px 10px ${iconBg}40` }}
              >
                {IconStr}
              </div>

              {/* Middle Text Content Block */}
              <div className="flex-1 overflow-hidden flex flex-col justify-center gap-1 self-center text-left">
                <span className={`text-[1rem] font-bold tracking-[-0.01em] ${isSelected ? 'text-indigo-500' : 'text-slate-800'}`}>
                  {p.name}
                </span>

                <div className={`flex items-center gap-1.5 text-[0.8rem] font-semibold ${isLive ? 'text-emerald-500' : 'text-slate-500'}`}>
                  <span className={`w-[5px] h-[5px] rounded-full ${isLive ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  {isLive ? 'Connected & Active' : 'Coming Soon'}
                </div>

                <div className="text-[0.8rem] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  Types: {p.capabilities?.searchTypes?.join(', ') || 'Companies, People'}
                </div>
              </div>

              {/* Right Alignment Block (Badge & Arrow) */}
              <div className="flex flex-col justify-between items-end shrink-0 min-h-[46px]">
                {isLive ? (
                  <span className="text-[0.62rem] py-1 px-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold tracking-[0.04em] border border-emerald-600/20">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[0.62rem] py-1 px-2.5 rounded-xl bg-orange-50 text-orange-600 font-extrabold tracking-[0.04em] border border-orange-600/20">
                    COMING SOON
                  </span>
                )}

                <ChevronRight size={18} color={isSelected ? "#818cf8" : "#cbd5e1"} strokeWidth={3} className="mb-0.5 mr-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
