import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { computeBestStreak, computeCurrentStreak, computeRangeRatio } from '@/features/consistency/streak';
import { loadConsistencyContext } from '@/features/consistency/hooks';
import { buildExportHtml, type ExportPhotoGroup } from '@/features/export/build-pdf';
import { resolveExportRange, type ExportRangeOption } from '@/features/export/resolve-range';
import { getAllPhotos } from '@/features/photos/api';
import type { DateString } from '@/lib/date';

export async function generateAndShareExport(options: {
  rangeOption: ExportRangeOption;
  custom?: { from: DateString; to: DateString };
  includePhotos: boolean;
}) {
  const ctx = await loadConsistencyContext();
  const { fromDate, toDate, rangeLabel } = resolveExportRange(
    options.rangeOption,
    ctx.earliestStart,
    ctx.currentDate,
    options.custom
  );

  const { completed, total } = computeRangeRatio(fromDate, toDate, ctx.currentDate, ctx.dayStatus);
  const currentStreak = computeCurrentStreak(ctx.currentDate, ctx.dayStatus);
  const bestStreakInRange = computeBestStreak(fromDate, toDate, ctx.dayStatus);

  let photoGroups: ExportPhotoGroup[] | null = null;
  if (options.includePhotos) {
    const allPhotos = await getAllPhotos();
    const inRange = allPhotos.filter((p) => p.date >= fromDate && p.date <= toDate);

    const byAngle = new Map<string, { date: string; filePath: string }[]>();
    for (const photo of inRange) {
      const list = byAngle.get(photo.angle) ?? [];
      list.push({ date: photo.date, filePath: photo.filePath });
      byAngle.set(photo.angle, list);
    }
    photoGroups = [...byAngle.entries()].map(([angle, photos]) => ({
      angle,
      photos: photos.sort((a, b) => (a.date < b.date ? -1 : 1)),
    }));
  }

  const html = buildExportHtml({ rangeLabel, completed, total, currentStreak, bestStreakInRange }, photoGroups);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  return uri;
}
