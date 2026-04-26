/**
 * ElevenLabs scripted lines for SOS screens — text follows UI language (en/zh).
 */
import { t, type Lang } from '@/components/lifelink/i18n';

const RESPOND_KEYS = ['voice.sos.respond.1', 'voice.sos.respond.2', 'voice.sos.respond.3', 'voice.sos.respond.4'] as const;
const BREATHE_KEYS = ['voice.sos.breathe.1', 'voice.sos.breathe.2', 'voice.sos.breathe.3'] as const;
const TUTORIAL_KEYS = [
  'voice.sos.tutorial.0',
  'voice.sos.tutorial.1',
  'voice.sos.tutorial.2',
  'voice.sos.tutorial.3',
  'voice.sos.tutorial.4',
  'voice.sos.tutorial.5',
  'voice.sos.tutorial.6',
  'voice.sos.tutorial.7',
  'voice.sos.tutorial.8',
  'voice.sos.tutorial.9',
] as const;

export function getSosRespondVoiceLines(lang: Lang): readonly string[] {
  return RESPOND_KEYS.map((k) => t(k, lang));
}

export function getSosBreatheVoiceLines(lang: Lang): readonly string[] {
  return BREATHE_KEYS.map((k) => t(k, lang));
}

export function getSosCprTutorialVoiceLines(lang: Lang): readonly string[] {
  return TUTORIAL_KEYS.map((k) => t(k, lang));
}
