import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from '../worker/canonical';

const SITE = 'pitchsafe.us';
const at = (u: string) => canonicalRedirect(new URL(u), SITE);

describe('canonicalRedirect', () => {
  it('sends plain http to https on the same host', () => {
    expect(at('http://pitchsafe.us/app?x=1')).toBe('https://pitchsafe.us/app?x=1');
    expect(at('http://pitchsafe.tiger-tayo.workers.dev/')).toBe('https://pitchsafe.tiger-tayo.workers.dev/');
  });

  it('sends www to the bare domain, over https', () => {
    expect(at('https://www.pitchsafe.us/science?x=1')).toBe('https://pitchsafe.us/science?x=1');
    expect(at('http://www.pitchsafe.us/')).toBe('https://pitchsafe.us/');
  });

  it('leaves the canonical address and workers.dev over https alone', () => {
    expect(at('https://pitchsafe.us/app')).toBeNull();
    expect(at('https://pitchsafe.tiger-tayo.workers.dev/api/health')).toBeNull();
  });

  it('never redirects local development', () => {
    expect(at('http://localhost:5173/app')).toBeNull();
    expect(at('http://127.0.0.1:8787/')).toBeNull();
    expect(at('http://pitchsafe.localhost:5173/')).toBeNull();
    expect(at('http://192.168.1.20:5173/')).toBeNull();
  });

  it('never redirects to a host it does not serve', () => {
    expect(at('http://evil.example/')).toBeNull();
    expect(at('http://pitchsafe.us.evil.example/')).toBeNull();
    expect(at('https://www.evil.example/')).toBeNull();
  });

  it('keeps the target on our host whatever the path looks like', () => {
    expect(at('http://pitchsafe.us//evil.example/x')).toBe('https://pitchsafe.us//evil.example/x');
  });

  it('does nothing when no site host is configured', () => {
    expect(canonicalRedirect(new URL('https://www.pitchsafe.us/'), '')).toBeNull();
    expect(canonicalRedirect(new URL('http://pitchsafe.tiger-tayo.workers.dev/'), '')).toBe('https://pitchsafe.tiger-tayo.workers.dev/');
    expect(canonicalRedirect(new URL('http://pitchsafe.us/'), '')).toBeNull();
  });
});
