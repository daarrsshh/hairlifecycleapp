import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import {
  captureCurrentPhoto,
  getPhotosForDate,
  recordPhotoSetCompleted,
  type PhotoAngle,
} from '@/features/photos/api';
import {
  AngleCaptureFlow,
  CAPTURE_ANGLES,
  type CapturedPhotos,
} from '@/features/photos/components/angle-capture-flow';

export default function CapturePhotosScreen() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // A set is one day's four angles, so re-opening capture continues today's set rather than
  // starting a new one — angles already shot show up filled, and re-shooting one replaces it.
  const { data: existing, isLoading } = useQuery({
    queryKey: ['photos', 'today'],
    queryFn: () => getPhotosForDate(),
  });

  const initialPhotos = useMemo<CapturedPhotos>(() => {
    const map: CapturedPhotos = {};
    for (const photo of existing ?? []) map[photo.angle] = photo.filePath;
    return map;
  }, [existing]);

  async function save(captured: CapturedPhotos) {
    setSaving(true);
    try {
      // Only write angles whose image actually changed — re-saving an untouched one would
      // pointlessly copy a file onto a new path and delete the original.
      const changed = (Object.entries(captured) as [PhotoAngle, string][]).filter(
        ([angle, uri]) => initialPhotos[angle] !== uri
      );
      await Promise.all(changed.map(([angle, uri]) => captureCurrentPhoto(uri, angle)));

      // Completion is judged from what's actually stored, not from this screen's state.
      const stored = await getPhotosForDate();
      if (stored.length === CAPTURE_ANGLES.length) {
        await recordPhotoSetCompleted();
      }

      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Add photos' }} />
      {/* Waits for today's set: AngleCaptureFlow seeds its state once, so handing it a value
          that arrives later would be ignored. */}
      {isLoading ? (
        <ThemedView style={{ flex: 1 }} />
      ) : (
        <AngleCaptureFlow
          headerText="Line up each angle the same way as last time for the clearest comparison. Tap an angle you've already shot to retake it."
          saveLabel="Save"
          saving={saving}
          onSave={save}
          initialPhotos={initialPhotos}
        />
      )}
    </>
  );
}
