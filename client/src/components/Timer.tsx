"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTimer } from "@/hooks/useTimer";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useApiClient } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { AlarmSound, playAlarmSound } from "@/lib/alarmSounds";

interface TimerSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
}

interface Task {
  id: number;
  title: string;
}

interface TimerProps {
  activeTask: Task | null;
}

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export function Timer({ activeTask }: TimerProps) {
  const apiClient = useApiClient();
  const { user } = useAuth();
  const { modeColors } = useTheme();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [brownNoiseEnabled, setBrownNoiseEnabled] = useState(false);
  const [alarmSettings, setAlarmSettings] = useState<{ pomodoro: AlarmSound; shortBreak: AlarmSound; longBreak: AlarmSound }>({
    pomodoro: 'beep',
    shortBreak: 'chime',
    longBreak: 'bell',
  });
  
  // Brown noise audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const brownNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Load settings from localStorage on mount and listen for changes
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem('timerSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings(parsed);
        } catch (e) {
          console.error('Failed to parse saved settings', e);
        }
      }
      const brownNoisePref = localStorage.getItem('brownNoiseEnabled');
      if (brownNoisePref !== null) {
        setBrownNoiseEnabled(brownNoisePref === 'true');
      }
      const savedAlarms = localStorage.getItem('alarmSettings');
      if (savedAlarms) {
        try {
          setAlarmSettings(prev => ({ ...prev, ...JSON.parse(savedAlarms) }));
        } catch (e) {
          console.error('Failed to parse alarm settings', e);
        }
      }
    };
    
    loadSettings();
    
    // Listen for settings changes from SettingsDialog
    const handleSettingsChange = () => loadSettings();
    window.addEventListener('settingsChanged', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);
    
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  // Log session to API when timer completes
  const logSession = useCallback(async (timerMode: string) => {
    if (!user) return;
    
    const duration = timerMode === 'pomodoro' ? Math.round(settings.pomodoro / 60)
                   : timerMode === 'shortBreak' ? Math.round(settings.shortBreak / 60)
                   : Math.round(settings.longBreak / 60);
    
    try {
      await apiClient.post('/sessions', {
        taskId: activeTask?.id || null,
        type: timerMode,
        duration,
      });
      console.log(`Session logged: ${timerMode}, ${duration}min, task: ${activeTask?.title || 'none'}`);
    } catch (err) {
      console.error('Failed to log session:', err);
    }
  }, [apiClient, user, activeTask, settings]);

  const handleTimerComplete = useCallback((completedMode: string) => {
    // Play the alarm sound for the completed mode
    if (soundEnabled) {
      const sound = completedMode === 'pomodoro' ? alarmSettings.pomodoro
                  : completedMode === 'shortBreak' ? alarmSettings.shortBreak
                  : alarmSettings.longBreak;
      playAlarmSound(sound);
    }
    logSession(completedMode);
  }, [logSession, soundEnabled, alarmSettings]);

  const { 
    mode, 
    timeLeft, 
    isRunning, 
    startTimer, 
    pauseTimer, 
    resetTimer,
    switchMode,
    progress
  } = useTimer({
    pomodoroTime: settings.pomodoro,
    shortBreakTime: settings.shortBreak,
    longBreakTime: settings.longBreak,
    onComplete: handleTimerComplete,
  });

  // Brown noise generator
  const startBrownNoise = useCallback(() => {
    if (audioContextRef.current) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const bufferSize = audioContext.sampleRate * 2;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
      
      brownNoiseNodeRef.current = source;
      gainNodeRef.current = gainNode;
    } catch (e) {
      console.error('Failed to start brown noise:', e);
    }
  }, []);

  const stopBrownNoise = useCallback(() => {
    if (brownNoiseNodeRef.current) {
      brownNoiseNodeRef.current.stop();
      brownNoiseNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
  }, []);

  useEffect(() => {
    if (isRunning && brownNoiseEnabled) {
      startBrownNoise();
    } else {
      stopBrownNoise();
    }
    return () => stopBrownNoise();
  }, [isRunning, brownNoiseEnabled, startBrownNoise, stopBrownNoise]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playAlarm = () => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 600;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      };
      
      const now = audioContext.currentTime;
      playBeep(now);
      playBeep(now + 0.5);
      playBeep(now + 1.0);
      
      setTimeout(() => audioContext.close(), 2000);
    } catch (e) {
      console.log('Audio play failed', e);
    }
  };

  // Get current mode's color hue
  const getCurrentHue = () => {
    switch (mode) {
      case 'pomodoro': return modeColors.pomodoro;
      case 'shortBreak': return modeColors.shortBreak;
      case 'longBreak': return modeColors.longBreak;
    }
  };

  const getModeHue = (m: string) => {
    switch (m) {
      case 'pomodoro': return modeColors.pomodoro;
      case 'shortBreak': return modeColors.shortBreak;
      case 'longBreak': return modeColors.longBreak;
      default: return '350';
    }
  };

  const currentHue = getCurrentHue();

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-8">
      {/* Mode Switcher */}
      <div className="flex p-1 space-x-1 rounded-full bg-secondary/50 backdrop-blur-sm border border-border/50">
        <Button
          variant={mode === 'pomodoro' ? "default" : "ghost"}
          size="sm"
          onClick={() => switchMode('pomodoro')}
          className="rounded-full transition-all"
          style={mode === 'pomodoro' ? { backgroundColor: `hsl(${modeColors.pomodoro}, 70%, 50%)` } : {}}
        >
          Pomodoro
        </Button>
        <Button
          variant={mode === 'shortBreak' ? "default" : "ghost"}
          size="sm"
          onClick={() => switchMode('shortBreak')}
          className="rounded-full transition-all"
          style={mode === 'shortBreak' ? { backgroundColor: `hsl(${modeColors.shortBreak}, 70%, 50%)` } : {}}
        >
          Short Break
        </Button>
        <Button
          variant={mode === 'longBreak' ? "default" : "ghost"}
          size="sm"
          onClick={() => switchMode('longBreak')}
          className="rounded-full transition-all"
          style={mode === 'longBreak' ? { backgroundColor: `hsl(${modeColors.longBreak}, 70%, 50%)` } : {}}
        >
          Long Break
        </Button>
      </div>

      {/* Main Timer Display */}
      <Card 
        className="w-full aspect-square flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 border-2 backdrop-blur-xl shadow-2xl rounded-[3rem]"
        style={{
          backgroundColor: `hsla(${currentHue}, 70%, 50%, 0.1)`,
          borderColor: `hsla(${currentHue}, 70%, 50%, 0.5)`,
          color: `hsl(${currentHue}, 70%, 55%)`,
        }}
      >
        {/* Progress Background */}
        <div 
          className="absolute bottom-0 left-0 w-full transition-all duration-1000 ease-linear"
          style={{ 
            height: `${progress * 100}%`,
            backgroundColor: `hsla(${currentHue}, 70%, 50%, 0.1)`,
          }}
        />

        <div className="z-10 flex flex-col items-center space-y-6">
          <div className="text-8xl font-bold tracking-tighter tabular-nums select-none animate-in fade-in zoom-in duration-500">
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex items-center space-x-4">
             <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full border-2 text-current hover:bg-current/10 hover:text-current transition-all opacity-70 hover:opacity-100"
                onClick={resetTimer}
                title="Restart Timer"
             >
                <RotateCcw className="h-5 w-5" />
             </Button>
             <Button
                size="icon"
                variant="outline"
                className="h-16 w-16 rounded-full border-2 text-current hover:bg-current/10 hover:text-current transition-all"
                onClick={isRunning ? pauseTimer : startTimer}
             >
                {isRunning ? (
                  <Pause className="h-8 w-8 fill-current" />
                ) : (
                  <Play className="h-8 w-8 fill-current ml-1" />
                )}
             </Button>
          </div>
          
          {/* Active Task Display */}
          {activeTask && (
            <div className="text-center mt-2 px-4">
              <p className="text-sm opacity-70">Working on</p>
              <p className="text-lg font-medium truncate max-w-[280px]">{activeTask.title}</p>
            </div>
          )}
        </div>

        {/* Sound Toggle */}
        <div className="absolute top-6 right-6 flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-full hover:bg-current/10"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </Card>
      
      <div className="text-muted-foreground text-sm font-medium tracking-widest uppercase opacity-50">
        {isRunning ? 'Stay Focused' : 'Ready to Start?'}
      </div>
    </div>
  );
}
