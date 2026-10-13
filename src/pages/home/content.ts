// Copy for the home page. Every claim is backed by the science page; nothing is invented.

export const HERO = {
  title: 'Know when training turns risky.',
  lead: 'Log your sessions, recovery and cleats. PitchSafe turns them into one injury-risk score, built on published sports science. Free.',
  primary: { label: 'Use our app', to: '/use' },
  secondary: { label: 'See a sample dashboard', to: '/demo' },
} as const;

export const INPUTS = [
  {
    key: 'load',
    name: 'Training load',
    when: 'After every session',
    log: 'How long you played and how hard it felt, from 1 to 10.',
    get: 'Your training load, and how this week compares with your last four.',
    weight: '45%',
  },
  {
    key: 'recovery',
    name: 'Recovery',
    when: 'Once a week',
    log: 'Sleep, muscle soreness, stress and how well you ate.',
    get: 'A recovery score out of 10.',
    weight: '30%',
  },
  {
    key: 'cleats',
    name: 'Cleats and surface',
    when: 'Once',
    log: 'Your cleats and the surface you usually play on.',
    get: 'Whether your studs suit the ground, and safer options if not.',
    weight: '25%',
  },
  {
    key: 'injuries',
    name: 'Injury history',
    when: 'When it happens',
    log: 'Any injury: where, what type, how bad.',
    get: 'Extra weight for the injuries most likely to come back.',
    weight: 'up to ×2',
  },
] as const;

export const ACWR = {
  formula: '60 min × effort 7 = 420',
  ratio: 'Last 7 days ÷ your average week over the last 28',
  zones: [
    { range: 'Under 0.8', label: 'Under' },
    { range: '0.8 to 1.3', label: 'Sweet spot' },
    { range: '1.3 to 1.5', label: 'Caution' },
    { range: 'Above 1.5', label: 'Danger' },
  ],
  source: 'Hulin et al., 2016; Gabbett, 2016',
} as const;

export const LIMITS = [
  'It cannot diagnose an injury or tell you that you are fit to play.',
  'It relies on how hard you say a session felt, which is subjective.',
  'It cannot see contact injuries or freak accidents coming.',
  'It has not been tested in a clinical trial against real injury outcomes.',
] as const;

export const CLOSE = {
  title: 'Your next session is day one.',
  lead: 'Start now and your first full risk score is four weeks away.',
} as const;
