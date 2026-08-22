import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { AngleCaptureFlow, CAPTURE_ANGLES, type CapturedPhotos } from '@/features/photos/components/angle-capture-flow';
import { captureCurrentPhoto, recordPhotoSetCompleted, type PhotoAngle } from '@/features/photos/api';

export default function CapturePhotosScreen() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function save(captured: CapturedPhotos) {
    setSaving(true);
    try {
      const entries = Object.entries(captured) as [PhotoAngle, string][];
      await Promise.all(entries.map(([angle, uri]) => captureCurrentPhoto(uri, angle)));
      if (entries.length === CAPTURE_ANGLES.length) {
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
    <AngleCaptureFlow
      headerText="Line up each angle the same way as last time for the clearest comparison."
      saveLabel="Save"
      saving={saving}
      onSave={save}
    />
  );
}
