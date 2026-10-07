const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

/** "15m" | "7d" | "3600" → seconds */
export const durationToSeconds = (value: string): number => {
  const match = /^(\d+)\s*([smhdw]?)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  return Number(match[1]) * (match[2] ? UNITS[match[2]] : 1);
};
