const ANGLE_LABEL: Record<string, string> = {
  crown: 'Crown',
  hairline: 'Hairline',
  left_temple: 'Left temple',
  right_temple: 'Right temple',
};

export interface ExportSummary {
  rangeLabel: string;
  completed: number;
  total: number;
  currentStreak: number;
  bestStreakInRange: number;
}

export interface ExportPhotoGroup {
  angle: string;
  photos: { date: string; filePath: string }[];
}

/** Builds the export HTML (rendered to PDF by expo-print). Photos are grouped by angle and ordered chronologically within each group, so a doctor can review one angle's progression at a time (PRD §5.8). */
export function buildExportHtml(summary: ExportSummary, photoGroups: ExportPhotoGroup[] | null): string {
  const photosSection = photoGroups
    ? photoGroups
        .map(
          (group) => `
            <h3>${ANGLE_LABEL[group.angle] ?? group.angle}</h3>
            <div class="photo-row">
              ${group.photos
                .map((p) => `<div class="photo"><img src="${p.filePath}" /><div class="caption">${p.date}</div></div>`)
                .join('')}
            </div>
          `
        )
        .join('')
    : '';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; }
          h3 { font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
          .subtitle { color: #666; margin-bottom: 16px; }
          .stats { display: flex; gap: 16px; margin-top: 12px; }
          .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; }
          .stat .label { color: #666; font-size: 12px; }
          .stat .value { font-size: 20px; font-weight: 600; }
          .photo-row { display: flex; flex-wrap: wrap; gap: 12px; }
          .photo { width: 140px; }
          .photo img { width: 140px; height: 140px; object-fit: cover; border-radius: 8px; }
          .caption { font-size: 11px; color: #666; text-align: center; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>Consistency summary</h1>
        <div class="subtitle">${summary.rangeLabel}</div>

        <div class="stats">
          <div class="stat"><div class="label">Days on track</div><div class="value">${summary.completed} of ${summary.total}</div></div>
          <div class="stat"><div class="label">Current streak</div><div class="value">${summary.currentStreak}</div></div>
          <div class="stat"><div class="label">Best streak in range</div><div class="value">${summary.bestStreakInRange}</div></div>
        </div>

        ${photosSection ? `<h2>Progress photos</h2>${photosSection}` : ''}
      </body>
    </html>
  `;
}
