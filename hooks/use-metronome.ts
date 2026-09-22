"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * A metronome accurate enough to actually play along to.
 *
 * The obvious implementation — `setInterval(tick, 60000 / bpm)` — is not
 * usable for this. Timer callbacks are only ever "no earlier than", so
 * each one lands a few milliseconds late and the error accumulates: the
 * click walks steadily away from the beat over a song. Browsers also clamp
 * timers hard once a tab stops being foregrounded, which on a phone
 * happens the moment the screen is touched elsewhere.
 *
 * So the timer here never decides when a beat happens. It only *schedules*
 * them, ahead of time, against `AudioContext.currentTime` — a clock driven
 * by the audio hardware itself, independent of the main thread and immune
 * to its jank. Every 25ms the scheduler looks 120ms into the future and
 * hands the audio thread any beats falling in that window, each with an
 * exact start time. The audio thread plays them precisely, whatever the UI
 * is doing. (This is the lookahead scheduler pattern from Chris Wilson's
 * "A Tale of Two Clocks".)
 *
 * The visual side is driven from the same clock rather than from the
 * scheduler: scheduled beats go into a queue that a requestAnimationFrame
 * loop drains once `currentTime` actually reaches them. Flashing when the
 * beat is *scheduled* would put the flash up to 120ms ahead of the click —
 * plainly out of time at any tempo.
 *
 * Tempo and time-signature changes are read from a ref rather than being
 * effect dependencies, so adjusting the BPM mid-song retunes the next beat
 * instead of tearing down and restarting the scheduler (which would drop
 * the pulse and resynchronise from silence).
 */

export interface MetronomeBeat {
  /** Position within the bar, 0-indexed. 0 is the downbeat. */
  beat: number;
  beatsPerBar: number;
  /** Milliseconds between beats at the current tempo. */
  intervalMs: number;
}

export interface MetronomeController {
  /**
   * Registers a listener called once per beat, at the moment the beat is
   * actually due. Returns an unsubscribe function.
   *
   * Listeners are deliberately *not* React state updates: at 200 BPM a
   * state update per beat would re-render the whole Live Mode screen —
   * lyrics and all — three times a second on the kind of phone this runs
   * on. Subscribers drive their own DOM instead.
   */
  subscribe: (listener: (beat: MetronomeBeat) => void) => () => void;
}

export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const DEFAULT_BPM = 120;

/** How often the scheduler wakes to look ahead. */
const SCHEDULER_INTERVAL_MS = 25;
/** How far ahead of the audio clock beats are scheduled. */
const SCHEDULE_AHEAD_S = 0.12;
/** A beat or two of lead-in, so the first beat isn't scheduled in the past. */
const START_DELAY_S = 0.08;

const CLICK_DECAY_S = 0.04;
const DOWNBEAT_HZ = 1600;
const OFFBEAT_HZ = 900;
const DOWNBEAT_GAIN = 0.5;
const OFFBEAT_GAIN = 0.28;

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

/**
 * Queues one click on the audio thread for an exact future timestamp.
 *
 * The gain envelope matters more than it looks: starting or stopping an
 * oscillator at full amplitude produces a click of its own — a broadband
 * pop layered over the intended tone. Ramping up over 2ms and decaying
 * exponentially gives the short, dry tick a metronome should have.
 * Exponential ramps can't reach zero, hence the near-zero floor.
 */
function scheduleClick(
  context: AudioContext,
  time: number,
  isDownbeat: boolean,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(
    isDownbeat ? DOWNBEAT_HZ : OFFBEAT_HZ,
    time,
  );

  const peak = isDownbeat ? DOWNBEAT_GAIN : OFFBEAT_GAIN;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DECAY_S);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  // Stopping releases the node for collection; without it every beat of a
  // three-hour show would stay alive in the graph.
  oscillator.stop(time + CLICK_DECAY_S + 0.02);
}

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctor) return null;

  try {
    return new Ctor();
  } catch {
    return null;
  }
}

interface UseMetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  isRunning: boolean;
  /** When false the metronome still keeps time and flashes, just silently. */
  audioEnabled: boolean;
}

export function useMetronome({
  bpm,
  beatsPerBar,
  isRunning,
  audioEnabled,
}: UseMetronomeOptions): MetronomeController {
  const listenersRef = useRef<Set<(beat: MetronomeBeat) => void>>(new Set());
  const contextRef = useRef<AudioContext | null>(null);

  // Read by the running scheduler so tempo changes take effect on the next
  // beat without restarting it. See the note at the top of this file.
  const configRef = useRef({ bpm, beatsPerBar, audioEnabled });
  useEffect(() => {
    configRef.current = { bpm, beatsPerBar, audioEnabled };
  }, [bpm, beatsPerBar, audioEnabled]);

  // One AudioContext for the lifetime of the screen, suspended rather than
  // closed when the metronome stops. Browsers cap how many contexts a page
  // may hold, and creating one is only reliably permitted while handling a
  // user gesture — so churning one per start/stop risks a later start
  // being refused outright.
  useEffect(() => {
    return () => {
      const context = contextRef.current;
      contextRef.current = null;
      if (context) void context.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      const context = contextRef.current;
      if (context && context.state === "running") {
        void context.suspend().catch(() => {});
      }
      return;
    }

    if (!contextRef.current) {
      contextRef.current = createAudioContext();
    }
    const context = contextRef.current;
    if (!context) return;

    // Started from a button press, so the autoplay policy permits this.
    void context.resume().catch(() => {});

    let beatInBar = 0;
    let barLength = Math.max(1, configRef.current.beatsPerBar);
    let nextBeatTime = context.currentTime + START_DELAY_S;
    let pending: MetronomeBeat[] = [];
    let pendingTimes: number[] = [];

    const schedulerId = window.setInterval(() => {
      const config = configRef.current;
      const secondsPerBeat = 60 / clampBpm(config.bpm);
      const configuredBar = Math.max(1, config.beatsPerBar);

      // A time-signature change restarts the bar rather than letting the
      // old count run out against the new length — which would put the
      // accent on an arbitrary beat for one bar.
      if (configuredBar !== barLength) {
        barLength = configuredBar;
        beatInBar = 0;
      }

      // Recover from a main-thread stall longer than the lookahead window
      // — a song change re-rendering a long lyric sheet on a slow phone.
      // Without this, every beat missed during the stall is still
      // scheduled, but for a time already in the past, and Web Audio plays
      // a past-dated sound immediately: measured at 180 BPM, a 1.5s stall
      // fired four clicks simultaneously. Skipping whole beats keeps the
      // grid in phase with where it started while discarding the ones that
      // can no longer be played in time.
      if (nextBeatTime < context.currentTime) {
        const missed = Math.ceil(
          (context.currentTime - nextBeatTime) / secondsPerBeat,
        );
        nextBeatTime += missed * secondsPerBeat;
        beatInBar = (beatInBar + missed) % barLength;
      }

      while (nextBeatTime < context.currentTime + SCHEDULE_AHEAD_S) {
        if (config.audioEnabled) {
          scheduleClick(context, nextBeatTime, beatInBar === 0);
        }

        pending.push({
          beat: beatInBar,
          beatsPerBar: barLength,
          intervalMs: secondsPerBeat * 1000,
        });
        pendingTimes.push(nextBeatTime);

        nextBeatTime += secondsPerBeat;
        beatInBar = (beatInBar + 1) % barLength;
      }
    }, SCHEDULER_INTERVAL_MS);

    let frameId = requestAnimationFrame(function drain() {
      frameId = requestAnimationFrame(drain);

      const now = context.currentTime;
      let released = 0;
      while (released < pendingTimes.length && pendingTimes[released] <= now) {
        released++;
      }
      if (released === 0) return;

      const due = pending.slice(0, released);
      pending = pending.slice(released);
      pendingTimes = pendingTimes.slice(released);

      // Only the most recent beat is worth showing: if the tab was
      // backgrounded and rAF stopped, several will come due at once and
      // replaying them would fire a burst of flashes for beats that have
      // already passed.
      const listeners = Array.from(listenersRef.current);
      const latest = due[due.length - 1];
      for (const listener of listeners) listener(latest);
    });

    return () => {
      window.clearInterval(schedulerId);
      cancelAnimationFrame(frameId);
      pending = [];
      pendingTimes = [];
    };
  }, [isRunning]);

  const subscribe = useCallback((listener: (beat: MetronomeBeat) => void) => {
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return useMemo(() => ({ subscribe }), [subscribe]);
}
