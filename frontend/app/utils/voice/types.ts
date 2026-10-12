export type AnnouncementLanguage = 'uz' | 'ru'

/** Pluggable text-to-speech backend (browser speech synthesis, pre-recorded audio, cloud TTS…). */
export interface VoiceProvider {
  readonly name: string
  isSupported(): boolean
  speak(text: string, lang: AnnouncementLanguage): Promise<void>
  cancel(): void
}

/** Short attention sound played before an announcement. */
export interface ChimeProvider {
  unlock(): Promise<void>
  play(): Promise<void>
}
