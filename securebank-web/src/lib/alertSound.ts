export function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()

    const play = (freq: number, startAt: number, duration: number) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startAt)

      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(0.25, startAt + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration)

      osc.start(startAt)
      osc.stop(startAt + duration)
    }

    // Two-tone ding: high note then slightly lower
    play(1046, ctx.currentTime,        0.18)
    play(784,  ctx.currentTime + 0.14, 0.22)

    setTimeout(() => ctx.close(), 600)
  } catch {
    // AudioContext unavailable — fail silently
  }
}
