import type { AnnouncementLanguage, VoiceProvider } from './types'

const LANG_TAGS: Record<AnnouncementLanguage, string[]> = {
  // Uzbek voices are rare; Turkish/Russian voices pronounce Latin Uzbek text acceptably.
  uz: ['uz', 'tr', 'ru'],
  ru: ['ru'],
}
const BCP47: Record<AnnouncementLanguage, string> = { uz: 'uz-UZ', ru: 'ru-RU' }

export class SpeechSynthesisProvider implements VoiceProvider {
  readonly name = 'speech-synthesis'

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  private pickVoice(lang: AnnouncementLanguage): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices()
    for (const tag of LANG_TAGS[lang]) {
      const v = voices.find((voice) => voice.lang.toLowerCase().startsWith(tag))
      if (v) return v
    }
    return undefined
  }

  speak(text: string, lang: AnnouncementLanguage): Promise<void> {
    if (!this.isSupported()) return Promise.resolve()
    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text)
      const voice = this.pickVoice(lang)
      utter.lang = voice?.lang ?? BCP47[lang]
      if (voice) utter.voice = voice
      utter.rate = 0.9
      utter.pitch = 1
      utter.volume = 1
      utter.onend = () => resolve()
      utter.onerror = () => resolve()
      window.speechSynthesis.speak(utter)
    })
  }

  cancel(): void {
    if (this.isSupported()) window.speechSynthesis.cancel()
  }
}
