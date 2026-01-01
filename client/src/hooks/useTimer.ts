import { useState, useEffect, useRef, useCallback } from 'react';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface UseTimerProps {
  pomodoroTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  onComplete?: (completedMode: string) => void;
}

interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  hasStarted: boolean;
  pomodoroCount: number;
  endTime: number | null;
  isRunning: boolean;
}

const TIMER_STATE_KEY = 'timerState';

export const useTimer = ({
  pomodoroTime,
  shortBreakTime,
  longBreakTime,
  onComplete,
}: UseTimerProps) => {
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
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(initialState.pomodoroCount);
  const endTimeRef = useRef<number | null>(initialState.endTime);
  const hasStartedRef = useRef(initialState.hasStarted);
  const completingRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const fallbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDuration = useCallback((currentMode: TimerMode) => {
    switch (currentMode) {
      case 'pomodoro': return pomodoroTime;
      case 'shortBreak': return shortBreakTime;
      case 'longBreak': return longBreakTime;
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime]);

  // Save state to localStorage
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
    if (completingRef.current) return;
    completingRef.current = true;

    if (onComplete) onComplete(mode);

    let nextMode: TimerMode;
    
    if (mode === 'pomodoro') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      nextMode = newCount % 4 === 0 ? 'longBreak' : 'shortBreak';
    } else {
      nextMode = 'pomodoro';
    }

    const nextDuration = getDuration(nextMode);
    
    setMode(nextMode);
    setTimeLeft(nextDuration);
    hasStartedRef.current = true;
    
    // Auto-start the next timer
    setTimeout(() => {
      const now = Date.now();
      const newEndTime = now + nextDuration * 1000;
      endTimeRef.current = newEndTime;
      setIsRunning(true);
      
      // Start worker or fallback
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'START', payload: { endTime: newEndTime } });
      }
      completingRef.current = false;
    }, 500);
  }, [mode, pomodoroCount, onComplete, getDuration]);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      workerRef.current = new Worker('/timerWorker.js');
      
      workerRef.current.onmessage = (e) => {
        const { type, remaining } = e.data;
        
        if (type === 'TICK') {
          setTimeLeft(remaining);
        } else if (type === 'COMPLETE') {
          setIsRunning(false);
          endTimeRef.current = null;
          handleTimerComplete();
        }
      };

      workerRef.current.onerror = (err) => {
        console.warn('Worker error, using fallback:', err);
        workerRef.current = null;
      };
    } catch (err) {
      console.warn('Web Worker not supported, using fallback');
      workerRef.current = null;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [handleTimerComplete]);

  // Fallback interval for browsers without Web Worker support
  const startFallbackInterval = useCallback(() => {
    if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    
    fallbackIntervalRef.current = setInterval(() => {
      if (!endTimeRef.current || completingRef.current) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        setIsRunning(false);
        endTimeRef.current = null;
        handleTimerComplete();
      }
    }, 200);
  }, [handleTimerComplete]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    hasStartedRef.current = false;
    setIsRunning(false);
    endTimeRef.current = null;
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
  }, [getDuration]);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    
    const now = Date.now();
    const newEndTime = now + timeLeft * 1000;
    endTimeRef.current = newEndTime;
    hasStartedRef.current = true;
    setIsRunning(true);
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'START', payload: { endTime: newEndTime } });
    } else {
      startFallbackInterval();
    }
  }, [isRunning, timeLeft, startFallbackInterval]);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    
    if (endTimeRef.current) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
    }
    
    setIsRunning(false);
    endTimeRef.current = null;
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
  }, [isRunning]);

  // Handle visibility change - check timer when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && endTimeRef.current) {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'CHECK' });
        } else {
          // Fallback: check manually
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            setIsRunning(false);
            endTimeRef.current = null;
            handleTimerComplete();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, handleTimerComplete]);

  // Restore timer on mount
  useEffect(() => {
    if (initialState.isRunning && initialState.endTime) {
      const now = Date.now();
      if (initialState.endTime > now) {
        endTimeRef.current = initialState.endTime;
        const remaining = Math.ceil((initialState.endTime - now) / 1000);
        setTimeLeft(remaining);
        setIsRunning(true);
        
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'START', payload: { endTime: initialState.endTime } });
        } else {
          startFallbackInterval();
        }
      } else {
        setTimeLeft(0);
        setTimeout(() => handleTimerComplete(), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRunning && !hasStartedRef.current) {
      setTimeLeft(getDuration(mode));
    }
  }, [pomodoroTime, shortBreakTime, longBreakTime, getDuration, mode, isRunning]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    endTimeRef.current = null;
    hasStartedRef.current = false;
    completingRef.current = false;
    setTimeLeft(getDuration(mode));
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
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
