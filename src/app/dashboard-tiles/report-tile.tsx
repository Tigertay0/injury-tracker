// The coach report: a one-page PDF built on the player's device.
import { useState } from 'react';
import { FilePdf } from '@phosphor-icons/react';
import type { RiskModel } from '@shared/risk-model';
import { Button } from '@/components/ui/button';
import { useOverview } from '@/lib/player-data';
import { TILE_TITLES } from '../dashboard-order';
import { BIG_NUMBER, TileShell } from './tile-shell';

/** What the PDF has on its page (see downloadCoachReport in report-pdf.ts). */
const CONTENTS = ['Score', 'Load trend', 'Recovery', 'Cleats', 'Top actions'] as const;

export function ReportTile({ model }: { model: RiskModel }) {
  const overview = useOverview();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
    // The button stays focusable while it builds (aria-disabled, not disabled), so a second press has to be ignored here
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const { downloadCoachReport } = await import('@/lib/report-pdf');
      await downloadCoachReport(overview, model);
    } catch (err) {
      console.error('[report] PDF failed', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TileShell
      title={TILE_TITLES.report}
      titleId="report-title"
      className="gap-2"
      meta={<span className="tnum text-label text-ink-2 @[440px]:hidden">1 page PDF</span>}
    >
      <p className="hidden items-baseline gap-2 @[440px]:flex">
        <span className={BIG_NUMBER}>1</span>
        <span className="text-label text-ink-2">page PDF</span>
      </p>
      {/* The same list as the sentence below, as small tags, once the tile is wide enough to hold them in one row */}
      <ul aria-hidden className="hidden flex-wrap gap-1.5 @[440px]:flex">
        {CONTENTS.map((item) => (
          <li key={item} className="rounded-[var(--radius-chip)] bg-sunken px-2.5 py-0.5 text-caption text-ink-2">
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2">
        {failed ? (
          <p role="alert" className="text-label text-risk-very-high">
            The report could not be built. Try again.
          </p>
        ) : (
          // Under 330px there is no room for the sentence, so it is kept for screen readers only
          <p className="sr-only text-caption text-ink-2 @[330px]:not-sr-only @[400px]:text-label">
            A one-page PDF with your score, load trend, recovery, cleats and top actions. It is made on your device.
          </p>
        )}
        <Button variant="secondary" aria-disabled={busy || undefined} aria-busy={busy || undefined} onClick={() => void download()} className="self-start">
          <FilePdf aria-hidden />
          {busy ? 'Building PDF…' : 'Download coach report'}
        </Button>
      </div>
    </TileShell>
  );
}
