import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { loadConsistencyContext } from '@/features/consistency/hooks';
import { computeBestStreak, computeCurrentStreak, computeRangeRatio } from '@/features/consistency/streak';
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

/**
 * Photos are stored at full capture resolution and no compression, which is right for the
 * library and wrong for this document — the PDF renders each one in a 140px box.
 *
 * Embedding the originals would put roughly 9MB per photo, inflated a further 33% by base64,
 * into a single JavaScript string: an all-time export crosses half a gigabyte and dies with an
 * out-of-memory error rather than a message. Downscaling first is not a quality compromise
 * here, because nothing at 140px can show what the extra pixels held.
 */
const EXPORT_PHOTO_WIDTH = 600; // ~4x the 140px box, so it stays crisp zoomed or printed
const EXPORT_PHOTO_COMPRESS = 0.7;

/**
 * Inline a photo as a `data:` URI, downscaled to print size.
 *
 * The HTML previously pointed `<img src>` at the stored `file:///…` path. Whether the WebView
 * behind `expo-print` will load a local file is platform- and version-dependent, and when it
 * doesn't the failure is silent — a PDF that generates fine with blank spaces where the photos
 * should be. Embedding removes the question.
 *
 * Returns `null` for a photo that can't be read or resized, so one bad file drops out of the
 * export instead of failing the whole thing.
 */
async function toDataUri(filePath: string): Promise<string | null> {
  try {
    const rendered = await ImageManipulator.manipulate(filePath)
      .resize({ width: EXPORT_PHOTO_WIDTH })
      .renderAsync();
    const { base64 } = await rendered.saveAsync({
      base64: true,
      compress: EXPORT_PHOTO_COMPRESS,
      format: SaveFormat.JPEG,
    });
    return base64 ? `data:image/jpeg;base64,${base64}` : null;
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

    // Deliberately sequential, not Promise.all. Resizing decodes the full image into a bitmap
    // first — ~48MB for a 12MP photo — so mapping with Promise.all would start every decode at
    // once and hold them all live simultaneously. That out-of-memories on a long range for the
    // same reason the un-resized embedding did; running them one at a time keeps the peak at a
    // single decode regardless of how many photos the export covers.
    const byAngle = new Map<string, { date: string; filePath: string }[]>();
    for (const photo of inRange) {
      const dataUri = await toDataUri(photo.filePath);
      if (!dataUri) continue; // unreadable file — leave it out rather than print a gap
      const list = byAngle.get(photo.angle) ?? [];
      list.push({ date: photo.date, filePath: dataUri });
      byAngle.set(photo.angle, list);
    }
    photoGroups = [...byAngle.entries()].map(([angle, photos]) => ({
      angle,
      photos: photos.sort((a, b) => (a.date < b.date ? -1 : 1)),
    }));
  }

  const html = buildExportHtml({ rangeLabel, completed, total, currentStreak, bestStreakInRange }, photoGroups);

  // Ask for the bytes, not just a path. expo-print writes its own temp file outside the app
  // sandbox, and expo-file-system's scoped API refuses to read it ("Missing 'READ' permission")
  // exactly as Sharing refuses to expose it. Taking the PDF as base64 and writing it ourselves
  // means that file is never touched at all.
  const printed = await Print.printToFileAsync({ html, base64: true });
  if (!printed.base64) {
    throw new Error('The PDF was created but came back empty.');
  }

  const exportsDir = getExportsDirectory();
  clearPreviousExports(exportsDir);
  // A real filename, not expo-print's random one — this is a document people hand to a doctor.
  const target = new File(exportsDir, `hair-growth-${toDate}.pdf`);
  target.create({ overwrite: true });
  target.write(printed.base64, { encoding: 'base64' });

  // Sharing being unavailable is reported, not swallowed: the PDF exists either way, and a
  // caller that silently returns here is indistinguishable from the export doing nothing.
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(target.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }

  return { uri: target.uri, shared: canShare };
}
