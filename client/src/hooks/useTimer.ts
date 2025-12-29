import { useState, useEffect, useRef, useCallback } from 'react';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface UseTimerProps {
  pomodoroTime: number; // in seconds now
  shortBreakTime: number; // in seconds
  longBreakTime: number; // in seconds
  onComplete?: (completedMode: string) => void;
}

interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  hasStarted: boolean;
  pomodoroCount: number;
}

const TIMER_STATE_KEY = 'timerState';

export const useTimer = ({
  pomodoroTime,
  shortBreakTime,
  longBreakTime,
  onComplete,
}: UseTimerProps) => {
  // Load initial state from localStorage
  const getInitialState = (): TimerState => {
    if (typeof window === 'undefined') {
      return { mode: 'pomodoro', timeLeft: pomodoroTime, hasStarted: false, pomodoroCount: 0 };
    }
    try {
      const saved = localStorage.getItem(TIMER_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          mode: parsed.mode || 'pomodoro',
          timeLeft: parsed.timeLeft ?? pomodoroTime,
          hasStarted: parsed.hasStarted ?? false,
          pomodoroCount: parsed.pomodoroCount ?? 0,
        };
      }
    } catch (e) {
      console.error('Failed to load timer state', e);
    }
    return { mode: 'pomodoro', timeLeft: pomodoroTime, hasStarted: false, pomodoroCount: 0 };
  };

  const initialState = getInitialState();
  const [mode, setMode] = useState<TimerMode>(initialState.mode);
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(initialState.pomodoroCount);
  const endTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasStartedRef = useRef(initialState.hasStarted);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: TimerState = {
      mode,
      timeLeft,
      hasStarted: hasStartedRef.current,
      pomodoroCount,
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  }, [mode, timeLeft, pomodoroCount]);

  const getDuration = useCallback((currentMode: TimerMode) => {
    switch (currentMode) {
      case 'pomodoro': return pomodoroTime;
      case 'shortBreak': return shortBreakTime;
      case 'longBreak': return longBreakTime;
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime]);

  const switchMode = useCallback((newMode: TimerMode, autoStart: boolean = false) => {
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    hasStartedRef.current = false;
    if (!autoStart) {
      setIsRunning(false);
      endTimeRef.current = null;
    }
  }, [getDuration]);

  const handleTimerComplete = useCallback(() => {
    if (onComplete) onComplete(mode);

    let nextMode: TimerMode;
    
    if (mode === 'pomodoro') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      
      if (newCount % 4 === 0) {
        nextMode = 'longBreak';
      } else {
        nextMode = 'shortBreak';
      }
    } else {
      nextMode = 'pomodoro';
    }

    setMode(nextMode);
    const nextDuration = getDuration(nextMode);
    setTimeLeft(nextDuration);
    hasStartedRef.current = false;
    
    setTimeout(() => {
      const now = Date.now();
      endTimeRef.current = now + nextDuration * 1000;
      hasStartedRef.current = true;
      setIsRunning(true);
    }, 500);
  }, [mode, pomodoroCount, onComplete, getDuration]);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
    
    setTimeLeft(remaining);

    if (remaining <= 0) {
      setIsRunning(false);
      endTimeRef.current = null;
      handleTimerComplete();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [handleTimerComplete]);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    
    const now = Date.now();
    endTimeRef.current = now + timeLeft * 1000;
    hasStartedRef.current = true;
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRunning, timeLeft, tick]);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    endTimeRef.current = null;
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning && !hasStartedRef.current) {
      setTimeLeft(getDuration(mode));
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime, getDuration, mode, isRunning]);

  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    endTimeRef.current = null;
    hasStartedRef.current = false;
    setTimeLeft(getDuration(mode));
  }, [getDuration, mode]);

  return {
    mode,
    timeLeft,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    pomodoroCount,
    progress: 1 - timeLeft / getDuration(mode),
  };
};
