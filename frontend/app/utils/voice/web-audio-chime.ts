import type { ChimeProvider } from './types'

const NOTES = [
  { freq: 659.25, at: 0, dur: 0.35 },
  { freq: 523.25, at: 0.3, dur: 0.5 },
]

/** Two-tone "ding-dong" generated with the Web Audio API (no audio files needed). */
export class WebAudioChime implements ChimeProvider {
  private ctx: AudioContext | null = null

  private context(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    return this.ctx
  }

  async unlock(): Promise<void> {
    const ctx = this.context()
    if (ctx && ctx.state === 'suspended') await ctx.resume()
  }

  async play(): Promise<void> {
    const ctx = this.context()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()
    const start = ctx.currentTime + 0.05
    let end = start
    for (const note of NOTES) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0.0001, start + note.at)
      gain.gain.exponentialRampToValueAtTime(0.35, start + note.at + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start + note.at)
      osc.stop(start + note.at + note.dur + 0.05)
      end = Math.max(end, start + note.at + note.dur)
    }
    await new Promise((r) => setTimeout(r, (end - ctx.currentTime) * 1000 + 100))
  }
}
