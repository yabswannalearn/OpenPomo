"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Palette, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ALARM_SOUNDS, AlarmSound, playAlarmSound } from "@/lib/alarmSounds";

interface TimerSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
}

interface AlarmSettings {
  pomodoro: AlarmSound;
  shortBreak: AlarmSound;
  longBreak: AlarmSound;
}

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const DEFAULT_ALARMS: AlarmSettings = {
  pomodoro: 'beep',
  shortBreak: 'chime',
  longBreak: 'bell',
};

const toMinSec = (totalSeconds: number) => ({
  min: Math.floor(totalSeconds / 60),
  sec: totalSeconds % 60,
});

const toSeconds = (min: number, sec: number) => min * 60 + sec;

// Duration input that allows empty values during editing
function DurationInput({ 
  value, 
  onChange, 
  max,
  label
}: { 
  value: number; 
  onChange: (val: number) => void; 
  max: number;
  label: string;
}) {
  const [displayValue, setDisplayValue] = useState(value.toString());
  
  // Sync display value when prop changes
  useEffect(() => {
    setDisplayValue(value.toString());
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string during editing
    if (raw === '') {
      setDisplayValue('');
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(max, num));
      setDisplayValue(raw);
      onChange(clamped);
    }
  };
  
  const handleBlur = () => {
    // On blur, if empty, set to 0
    if (displayValue === '' || isNaN(parseInt(displayValue, 10))) {
      setDisplayValue('0');
      onChange(0);
    } else {
      const num = Math.max(0, Math.min(max, parseInt(displayValue, 10)));
      setDisplayValue(num.toString());
      onChange(num);
    }
  };
  
  return (
    <>
      <Input 
        type="number" 
        min={0} 
        max={max}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </>
  );
}

// Color picker component
function ColorSlider({ label, hue, onChange }: { label: string; hue: string; onChange: (hue: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center">
          <span className="w-4 h-4 rounded-full mr-2 border border-white/20" style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }} />
          {label}
        </span>
      </div>
      <input
        type="range" min="0" max="360" value={hue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-6 rounded-lg cursor-pointer appearance-none"
        style={{
          background: `linear-gradient(to right, hsl(0, 70%, 55%), hsl(60, 70%, 55%), hsl(120, 70%, 55%), 
            hsl(180, 70%, 55%), hsl(240, 70%, 55%), hsl(300, 70%, 55%), hsl(360, 70%, 55%))`,
        }}
      />
    </div>
  );
}

// Sound selector with preview
function SoundSelector({ 
  label, 
  value, 
  onChange,
  colorHue 
}: { 
  label: string; 
  value: AlarmSound; 
  onChange: (sound: AlarmSound) => void;
  colorHue: string;
}) {
  const handlePreview = () => {
    playAlarmSound(value);
  };

  return (
    <div className="flex items-center justify-between py-2">
      <label className="text-sm font-medium flex items-center">
        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(${colorHue}, 70%, 55%)` }} />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as AlarmSound)}
          className="bg-secondary border border-border rounded-md px-3 py-1 text-sm"
        >
          {ALARM_SOUNDS.map((sound) => (
            <option key={sound.value} value={sound.value}>{sound.label}</option>
          ))}
        </select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePreview}>
          <Volume2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const { isDark, modeColors, setModeColor } = useTheme();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [alarmSettings, setAlarmSettings] = useState<AlarmSettings>(DEFAULT_ALARMS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('timerSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    const savedAlarms = localStorage.getItem('alarmSettings');
    if (savedAlarms) {
      try {
        setAlarmSettings({ ...DEFAULT_ALARMS, ...JSON.parse(savedAlarms) });
      } catch (e) {
        console.error('Failed to parse alarm settings', e);
      }
    }
  }, []);

  const saveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem('timerSettings', JSON.stringify(tempSettings));
    localStorage.setItem('alarmSettings', JSON.stringify(alarmSettings));
    setSettingsOpen(false);
    window.dispatchEvent(new CustomEvent('settingsChanged'));
  };

  const openSettings = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };

  const updateAlarm = (mode: keyof AlarmSettings, sound: AlarmSound) => {
    setAlarmSettings(prev => ({ ...prev, [mode]: sound }));
  };

  const resetToDefaults = () => {
    setTempSettings(DEFAULT_SETTINGS);
    setAlarmSettings(DEFAULT_ALARMS);
    // Reset colors to defaults
    setModeColor('pomodoro', '350');
    setModeColor('shortBreak', '160');
    setModeColor('longBreak', '210');
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={(open) => !open && setSettingsOpen(false)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" onClick={openSettings} className="flex items-center space-x-1">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Timer Durations */}
          <div>
            <p className="text-sm font-medium mb-4">Timer Durations</p>
            
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(${modeColors.pomodoro}, 70%, 55%)` }} />
                Pomodoro
              </label>
              <div className="flex gap-2 items-center">
                <DurationInput 
                  value={toMinSec(tempSettings.pomodoro).min}
                  onChange={(val) => setTempSettings({ ...tempSettings, pomodoro: toSeconds(val, toMinSec(tempSettings.pomodoro).sec) })}
                  max={60}
                  label="min"
                />
                <DurationInput 
                  value={toMinSec(tempSettings.pomodoro).sec}
                  onChange={(val) => setTempSettings({ ...tempSettings, pomodoro: toSeconds(toMinSec(tempSettings.pomodoro).min, val) })}
                  max={59}
                  label="sec"
                />
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(${modeColors.shortBreak}, 70%, 55%)` }} />
                Short Break
              </label>
              <div className="flex gap-2 items-center">
                <DurationInput 
                  value={toMinSec(tempSettings.shortBreak).min}
                  onChange={(val) => setTempSettings({ ...tempSettings, shortBreak: toSeconds(val, toMinSec(tempSettings.shortBreak).sec) })}
                  max={30}
                  label="min"
                />
                <DurationInput 
                  value={toMinSec(tempSettings.shortBreak).sec}
                  onChange={(val) => setTempSettings({ ...tempSettings, shortBreak: toSeconds(toMinSec(tempSettings.shortBreak).min, val) })}
                  max={59}
                  label="sec"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(${modeColors.longBreak}, 70%, 55%)` }} />
                Long Break
              </label>
              <div className="flex gap-2 items-center">
                <DurationInput 
                  value={toMinSec(tempSettings.longBreak).min}
                  onChange={(val) => setTempSettings({ ...tempSettings, longBreak: toSeconds(val, toMinSec(tempSettings.longBreak).sec) })}
                  max={60}
                  label="min"
                />
                <DurationInput 
                  value={toMinSec(tempSettings.longBreak).sec}
                  onChange={(val) => setTempSettings({ ...tempSettings, longBreak: toSeconds(toMinSec(tempSettings.longBreak).min, val) })}
                  max={59}
                  label="sec"
                />
              </div>
            </div>
          </div>

          {/* Alarm Sounds */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-4 flex items-center">
              <Volume2 className="h-4 w-4 mr-2" />
              Alarm Sounds
            </p>
            <SoundSelector label="Pomodoro" value={alarmSettings.pomodoro} onChange={(s) => updateAlarm('pomodoro', s)} colorHue={modeColors.pomodoro} />
            <SoundSelector label="Short Break" value={alarmSettings.shortBreak} onChange={(s) => updateAlarm('shortBreak', s)} colorHue={modeColors.shortBreak} />
            <SoundSelector label="Long Break" value={alarmSettings.longBreak} onChange={(s) => updateAlarm('longBreak', s)} colorHue={modeColors.longBreak} />
          </div>

          {/* Appearance */}
          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium mb-4 flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </p>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Timer Colors</p>
              <ColorSlider label="Pomodoro Color" hue={modeColors.pomodoro} onChange={(hue) => setModeColor('pomodoro', hue)} />
              <ColorSlider label="Short Break Color" hue={modeColors.shortBreak} onChange={(hue) => setModeColor('shortBreak', hue)} />
              <ColorSlider label="Long Break Color" hue={modeColors.longBreak} onChange={(hue) => setModeColor('longBreak', hue)} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetToDefaults} className="flex-1">Reset to Defaults</Button>
            <Button onClick={saveSettings} className="flex-1">Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
