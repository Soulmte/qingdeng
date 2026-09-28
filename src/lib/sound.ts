let audioContext: AudioContext | null = null;

/** 阶段结束提示音：用振荡器现场合成，省掉音频资源文件 */
export function playPhaseChime(pattern: "focus_end" | "break_end" = "focus_end") {
  const tones = pattern === "focus_end" ? [660, 880] : [880, 660];

  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    if (context.state === "suspended") void context.resume();

    tones.forEach((frequency, index) => {
      const startAt = context.currentTime + index * 0.22;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.22);
    });
  } catch {
    // 音频不可用时静默降级，不影响计时
  }
}
