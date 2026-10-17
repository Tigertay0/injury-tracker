// The coach report: a one-page PDF built on the player's device.
import { useState } from 'react';
import { FilePdf } from '@phosphor-icons/react';
import type { RiskModel } from '@shared/risk-model';
import { Button } from '@/components/ui/button';
import { useOverview } from '@/lib/player-data';
import { TILE_TITLES } from '../dashboard-order';
import { TileShell } from './tile-shell';

export function ReportTile({ model }: { model: RiskModel }) {
  const overview = useOverview();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const download = async () => {
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
    <TileShell title={TILE_TITLES.report} titleId="report-title">
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3">
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
        <Button variant="secondary" disabled={busy} onClick={() => void download()} className="self-start">
          <FilePdf aria-hidden />
          {busy ? 'Building PDF…' : 'Download coach report'}
        </Button>
      </div>
    </TileShell>
  );
}
