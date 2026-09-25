import { Sparkles } from 'lucide-react';
import { SavedSearchPreset } from '@/features/providers/types';

export type SavedSearchPresetsPanelProps = {
  savedPresets: SavedSearchPreset[];
  selectedPresetId: string | null;
  setSelectedPresetId: (id: string | null) => void;
  setSelectedProviderId: (id: string) => void;
  setCompanyKeywords: (val: string) => void;
  setCompanyTechUsage: (val: string) => void;
  setCompanyHiringKeywords: (val: string) => void;
  setCompanyLocation: (val: string) => void;
  setEmployeeCountRange: (val: string) => void;
  triggerNotification: (type: 'success' | 'error', msg: string) => void;
};

export function SavedSearchPresetsPanel({
  savedPresets,
  selectedPresetId,
  setSelectedPresetId,
  setSelectedProviderId,
  setCompanyKeywords,
  setCompanyTechUsage,
  setCompanyHiringKeywords,
  setCompanyLocation,
  setEmployeeCountRange,
  triggerNotification
}: SavedSearchPresetsPanelProps) {
  if (savedPresets.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-indigo-500" />
        <span className="text-[1.2rem] font-semibold text-slate-900">
          BDE Saved Search Presets
        </span>
        <span className="text-[0.79rem] text-slate-500">— Pre-configured high-intent prospecting queries</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {savedPresets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setSelectedProviderId(preset.providerId);
                if (preset.filters.industry) setCompanyKeywords(preset.filters.industry);
                if (preset.filters.technology) setCompanyTechUsage(preset.filters.technology);
                if (preset.filters.hiringKeywords) setCompanyHiringKeywords(preset.filters.hiringKeywords);
                if (preset.filters.country) setCompanyLocation(preset.filters.country);
                if (preset.filters.employees) setEmployeeCountRange(preset.filters.employees);
                triggerNotification('success', `Applied Saved Search: ${preset.name}`);
              }}
              className={`apollo-preset-btn ${isSelected ? 'active' : ''}`}
            >
              <span>{preset.name}</span>
              {preset.badgeLabel && (
                <span className="apollo-preset-badge">
                  {preset.badgeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
