import { describe, expect, it } from 'vitest';
import { getPasswordRecoveryRedirectUrl, isPasswordRecovery } from './PasswordRecovery';

describe('password recovery routing', () => {
  it('replaces the retired production alias with the canonical domain', () => {
    expect(getPasswordRecoveryRedirectUrl(new URL('https://apbet.vercel.app/?view=rankings')))
      .toBe('https://apbey.vercel.app/?recovery=1');
  });

  it('keeps valid preview and local origins when no canonical URL is configured', () => {
    expect(getPasswordRecoveryRedirectUrl(new URL('http://localhost:5173/')))
      .toBe('http://localhost:5173/?recovery=1');
  });

  it('recognizes expired recovery links so the app can offer another email', () => {
    const url = new URL('https://apbey.vercel.app/#error=access_denied&error_code=otp_expired');
    expect(isPasswordRecovery(url)).toBe(true);
  });
});
