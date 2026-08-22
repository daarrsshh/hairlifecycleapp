import { TREATMENT_PRESETS } from '@/features/treatment/presets';

export function describeTreatment(planType: string, drugs: { drugName: string }[]): string {
  const preset = TREATMENT_PRESETS.find((p) => p.id === planType);
  if (preset) return preset.label;
  return drugs.map((d) => d.drugName).join(' + ') || 'Untitled routine';
}
