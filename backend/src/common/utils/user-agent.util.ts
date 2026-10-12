import { UAParser } from 'ua-parser-js';

export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
  device: 'desktop' | 'mobile' | 'tablet' | null;
}

export const parseUserAgent = (ua: string | null): ParsedUserAgent => {
  if (!ua) return { browser: null, os: null, device: null };
  const result = new UAParser(ua).getResult();
  const browser = result.browser.name ? `${result.browser.name}${result.browser.major ? ` ${result.browser.major}` : ''}` : null;
  const os = result.os.name ? `${result.os.name}${result.os.version ? ` ${result.os.version}` : ''}` : null;
  const type = result.device.type;
  const device = type === 'mobile' ? 'mobile' : type === 'tablet' ? 'tablet' : 'desktop';
  return { browser, os, device };
};
