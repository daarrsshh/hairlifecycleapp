import type { PhotoAngle } from '@/features/photos/api';
import type { DateString } from '@/lib/date';

export interface TimelineTreatmentPeriod {
  id: string;
  planType: string;
  startDate: DateString;
}

export interface TimelineDrug {
  treatmentPeriodId: string;
  drugName: string;
}

export interface TimelinePauseWindow {
  treatmentPeriodId: string;
  pausedAt: DateString;
  resumedAt: DateString | null;
}

export interface TimelinePhoto {
  date: DateString;
  angle: PhotoAngle;
}

export type TimelineEvent =
  | { type: 'treatment-started'; date: DateString; periodId: string; label: string; drugNames: string[] }
  | { type: 'treatment-paused'; date: DateString; periodId: string }
  | { type: 'treatment-resumed'; date: DateString; periodId: string }
  | { type: 'photos'; date: DateString; angles: PhotoAngle[] };

/** Merges treatment period/pause history and photo captures into one chronological feed (PRD §5.6: photos + treatment changes are the only two layers in v1). */
export function buildTimeline(
  periods: TimelineTreatmentPeriod[],
  drugs: TimelineDrug[],
  pauseWindows: TimelinePauseWindow[],
  photos: TimelinePhoto[],
  describeTreatment: (planType: string, drugs: { drugName: string }[]) => string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const period of periods) {
    const periodDrugs = drugs.filter((d) => d.treatmentPeriodId === period.id);
    events.push({
      type: 'treatment-started',
      date: period.startDate,
      periodId: period.id,
      label: describeTreatment(period.planType, periodDrugs),
      drugNames: periodDrugs.map((d) => d.drugName),
    });
  }

  for (const pause of pauseWindows) {
    events.push({ type: 'treatment-paused', date: pause.pausedAt, periodId: pause.treatmentPeriodId });
    if (pause.resumedAt) {
      events.push({ type: 'treatment-resumed', date: pause.resumedAt, periodId: pause.treatmentPeriodId });
    }
  }

  const photosByDate = new Map<DateString, PhotoAngle[]>();
  for (const photo of photos) {
    const list = photosByDate.get(photo.date) ?? [];
    list.push(photo.angle);
    photosByDate.set(photo.date, list);
  }
  for (const [date, angles] of photosByDate) {
    events.push({ type: 'photos', date, angles });
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
