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
  endTime: number | null; // Store the absolute end time for background persistence
  isRunning: boolean;
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
      return { mode: 'pomodoro', timeLeft: pomodoroTime, hasStarted: false, pomodoroCount: 0, endTime: null, isRunning: false };
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
          endTime: parsed.endTime ?? null,
          isRunning: parsed.isRunning ?? false,
        };
      }
    } catch (e) {
      console.error('Failed to load timer state', e);
    }
    return { mode: 'pomodoro', timeLeft: pomodoroTime, hasStarted: false, pomodoroCount: 0, endTime: null, isRunning: false };
  };

  const initialState = getInitialState();
  const [mode, setMode] = useState<TimerMode>(initialState.mode);
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isRunning, setIsRunning] = useState(initialState.isRunning && initialState.endTime !== null);
  const [pomodoroCount, setPomodoroCount] = useState(initialState.pomodoroCount);
  const endTimeRef = useRef<number | null>(initialState.endTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(initialState.hasStarted);
  const completingRef = useRef(false); // Prevent double completion

  const getDuration = useCallback((currentMode: TimerMode) => {
    switch (currentMode) {
      case 'pomodoro': return pomodoroTime;
      case 'shortBreak': return shortBreakTime;
      case 'longBreak': return longBreakTime;
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime]);

  // Save state to localStorage whenever it changes - include endTime and isRunning
  useEffect(() => {
    const state: TimerState = {
      mode,
      timeLeft,
      hasStarted: hasStartedRef.current,
      pomodoroCount,
      endTime: endTimeRef.current,
      isRunning,
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  }, [mode, timeLeft, pomodoroCount, isRunning]);

  const handleTimerComplete = useCallback(() => {
    // Prevent double completion
    if (completingRef.current) return;
    completingRef.current = true;

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

    const nextDuration = getDuration(nextMode);
    
    setMode(nextMode);
    setTimeLeft(nextDuration);
    hasStartedRef.current = true;
    
    // Auto-start the next timer after a brief pause
    setTimeout(() => {
      const now = Date.now();
      endTimeRef.current = now + nextDuration * 1000;
      setIsRunning(true);
      completingRef.current = false;
    }, 500);
  }, [mode, pomodoroCount, onComplete, getDuration]);

  const switchMode = useCallback((newMode: TimerMode, autoStart: boolean = false) => {
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    hasStartedRef.current = false;
    if (!autoStart) {
      setIsRunning(false);
      endTimeRef.current = null;
    }
  }, [getDuration]);

  // Core tick function - checks time and handles completion
  const tick = useCallback(() => {
    if (!endTimeRef.current || completingRef.current) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
    
    setTimeLeft(remaining);

    if (remaining <= 0) {
      // Clear interval before completing to prevent multiple fires
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRunning(false);
      endTimeRef.current = null;
      handleTimerComplete();
    }
  }, [handleTimerComplete]);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    
    const now = Date.now();
    endTimeRef.current = now + timeLeft * 1000;
    hasStartedRef.current = true;
    setIsRunning(true);
  }, [isRunning, timeLeft]);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    
    // Calculate remaining time before stopping
    if (endTimeRef.current) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
    }
    
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  }, [isRunning]);

  // Handle visibility change - catch up when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && endTimeRef.current) {
        // Immediately check if timer should have completed while in background
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, tick]);

  // Restore timer on mount if it was running
  useEffect(() => {
    if (initialState.isRunning && initialState.endTime) {
      const now = Date.now();
      if (initialState.endTime > now) {
        // Timer still has time left
        endTimeRef.current = initialState.endTime;
        const remaining = Math.ceil((initialState.endTime - now) / 1000);
        setTimeLeft(remaining);
        setIsRunning(true);
      } else {
        // Timer should have completed while away - complete it now
        setTimeLeft(0);
        setTimeout(() => handleTimerComplete(), 100);
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRunning && !hasStartedRef.current) {
      setTimeLeft(getDuration(mode));
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime, getDuration, mode, isRunning]);

  // Use setInterval for timer ticks - works in background tabs (though throttled)
  useEffect(() => {
    if (isRunning && endTimeRef.current) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Run tick immediately
      tick();
      // Run every 200ms - browsers throttle to 1s in background anyway
      intervalRef.current = setInterval(tick, 200);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
    hasStartedRef.current = false;
    completingRef.current = false;
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
