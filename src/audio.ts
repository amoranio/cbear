let currentAudio: HTMLAudioElement | null = null;

export function playPhoneme(sound: string): Promise<void> {
  return playClip(`audio/${sound}.m4a`);
}

export function playClip(path: string, spokenFallback?: string): Promise<void> {
  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(`${import.meta.env.BASE_URL}${path}`);
  return currentAudio.play().catch(error => {
    if (spokenFallback && speak(spokenFallback)) return;
    throw error;
  });
}

export function speak(text: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 0.84;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang.toLowerCase() === 'en-gb') ?? null;
  window.speechSynthesis.speak(utterance);
  return true;
}
