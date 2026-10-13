// Public sample dashboard: the real app screens on sample data held in this tab only.
import { Link } from 'react-router';
import { localToday } from '@shared/dates';
import { Button } from '@/components/ui/button';
import { AppBaseContext, DemoPlayerDataProvider } from '@/lib/player-data';
import { sampleOverview } from '@/lib/sample-data';
import { Shell } from './shell';

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-accent-soft px-4 py-2.5 sm:px-6">
      <p className="text-small text-ink">
        <span className="font-semibold">Sample player.</span> Try anything: nothing here is saved.
      </p>
      <Button asChild size="sm">
        <Link to="/use">Use our app</Link>
      </Button>
    </div>
  );
}

export default function DemoLayout() {
  return (
    <div className="app-scope min-h-dvh bg-ground text-ink">
      <AppBaseContext.Provider value="/demo">
        <DemoPlayerDataProvider initial={() => sampleOverview(localToday())}>
          <Shell banner={<DemoBanner />} />
        </DemoPlayerDataProvider>
      </AppBaseContext.Provider>
    </div>
  );
}
