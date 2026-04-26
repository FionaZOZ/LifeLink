/** One-way ElevenLabs lines aligned with each SOS screen (no user replies). */

export const SOS_RESPOND_LINES = [
  'Step one. Before we call for more help, check if they respond.',
  'Tap their shoulders firmly.',
  'Shout: Are you OK?',
  'Look for any movement, sound, or eye opening for up to ten seconds.',
  'If they moved, spoke, or opened their eyes, choose they responded. If not, choose no response to continue.',
] as const;

export const SOS_BREATHE_LINES = [
  'Step two. Are they breathing? Tilt their head back and watch the chest.',
  'Look, listen, and feel for normal breathing for no more than ten seconds. Gasping is not normal breathing.',
  'If they are breathing normally, choose that option. If they are not breathing or only gasping, start CPR now.',
] as const;

export const SOS_CPR_TUTORIAL_LINES = [
  'Before you start compressions, place your hands like this.',
  'Put the heel of one hand on the center of the chest, on the lower half of the breastbone.',
  'If you have a sensor patch, place it on the spot where you will press.',
  'Stack your other hand on top. Heel of one, palm of the other.',
  'Lock your elbows. Keep your arms straight with your shoulders over your hands.',
  'Push about two inches deep using your whole body weight.',
  'Push at about one hundred ten beats per minute, roughly twice per second.',
  'Let the chest fully come back up between pushes. Do not lean on the chest.',
  'When you are ready, tap start CPR.',
] as const;
