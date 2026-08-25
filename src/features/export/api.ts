import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { computeBestStreak, computeCurrentStreak, computeRangeRatio } from '@/features/consistency/streak';
import { loadConsistencyContext } from '@/features/consistency/hooks';
import { buildExportHtml, type ExportPhotoGroup } from '@/features/export/build-pdf';
import { resolveExportRange, type ExportRangeOption } from '@/features/export/resolve-range';
import { getAllPhotos } from '@/features/photos/api';
import type { DateString } from '@/lib/date';

/**
 * Where the finished PDF is staged before sharing.
 *
 * `Print.printToFileAsync` writes into its own temp location, which Android's FileProvider is
 * not configured to expose — sharing straight from it is rejected with "Not allowed to read
 * file under given URL". Copying into the app's own document tree (the same one progress photos
 * live in, which is covered by the provider) is what makes the share succeed.
 *
 * Built lazily inside the function, never at module scope: expo-file-system has no native
 * module during web's SSR pass, and a module-scope `new Directory(...)` crashes the route tree
 * at import time.
 */
function getExportsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'exports');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

/** Exports are disposable, and one can be several MB with photos — keep only the newest. */
function clearPreviousExports(dir: Directory) {
  try {
    for (const entry of dir.list()) {
      if (entry instanceof File) entry.delete();
    }
  } catch {
    // Tidying is best-effort; a failure here must not block the export itself.
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

/**
 * Inline a photo as a `data:` URI.
 *
 * The HTML previously pointed `<img src>` at the stored `file:///…` path. Whether the WebView
 * behind `expo-print` will load a local file is platform- and version-dependent, and when it
 * doesn't the failure is silent — a PDF that generates fine with blank spaces where the photos
 * should be. Embedding removes the question.
 *
 * Returns `null` for a file that can't be read, so one missing photo drops out of the export
 * instead of failing the whole thing. `File` is constructed inside the function, never at module
 * scope — expo-file-system has no native module during web's SSR pass.
 */
async function toDataUri(filePath: string): Promise<string | null> {
  try {
    const file = new File(filePath);
    const base64 = await file.base64();
    const mime = MIME_BY_EXTENSION[(file.extension || '.jpg').toLowerCase()] ?? 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

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
  const currentStreak = computeCurrentStreak(ctx.currentDate, ctx.dayStatus, ctx.earliestStart);
  const bestStreakInRange = computeBestStreak(fromDate, toDate, ctx.dayStatus);

  let photoGroups: ExportPhotoGroup[] | null = null;
  if (options.includePhotos) {
    const allPhotos = await getAllPhotos();
    const inRange = allPhotos.filter((p) => p.date >= fromDate && p.date <= toDate);

    const embedded = await Promise.all(
      inRange.map(async (photo) => ({
        angle: photo.angle,
        date: photo.date,
        filePath: await toDataUri(photo.filePath),
      }))
    );

    const byAngle = new Map<string, { date: string; filePath: string }[]>();
    for (const photo of embedded) {
      if (!photo.filePath) continue; // unreadable file — leave it out rather than print a gap
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
  const printed = await Print.printToFileAsync({ html });

  // Restage into our own document tree before sharing — see getExportsDirectory. The rename is
  // a bonus: expo-print's output has a random name, and this is a file people hand to a doctor.
  const exportsDir = getExportsDirectory();
  clearPreviousExports(exportsDir);
  const target = new File(exportsDir, `HairLifecycle-${toDate}.pdf`);
  await new File(printed.uri).copy(target);

  // Sharing being unavailable is reported, not swallowed: the PDF exists either way, and a
  // caller that silently returns here is indistinguishable from the export doing nothing.
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  return { uri: target.uri, shared: canShare };
}
