"use client";

import { Timer } from "@/components/Timer";
import { TaskList } from "@/components/TaskList";
import { Button } from "@/components/ui/button";
import { CheckCircle2, BarChart3, Sun, Moon, Waves, Target } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

interface Task {
  id: number;
  title: string;
  completed: boolean;
  estPomodoros: number;
  actPomodoros: number;
}

// Quick theme toggle button for header
function ThemeToggle() {
  const { isDark, toggleDarkMode } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-9 w-9" title={isDark ? 'Light Mode' : 'Dark Mode'}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// Brown noise toggle for header
function BrownNoiseToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('brownNoiseEnabled') === 'true';
  });
  
  const toggle = () => {
    const newVal = !enabled;
    setEnabled(newVal);
    localStorage.setItem('brownNoiseEnabled', String(newVal));
    window.dispatchEvent(new CustomEvent('settingsChanged'));
  };
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggle} 
      className={`h-9 w-9 ${enabled ? 'text-amber-500' : ''}`}
      title={enabled ? 'Brown Noise On' : 'Brown Noise Off'}
    >
      <Waves className="h-4 w-4" />
    </Button>
  );
}

export default function Home() {
  const { user, logout, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  if (loading) return null; // Or a spinner

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-background via-background/90 to-primary/5 text-foreground relative selection:bg-primary/20">
      
      {/* Header */}
      <header className="w-full flex items-center justify-between p-6 max-w-5xl mx-auto">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OpenPomo</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {!user ? (
            <div className="space-x-2">
               <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" onClick={() => setAuthMode('login')}>Sign in</Button>
                  </DialogTrigger>
                  <DialogContent>
                    {authMode === 'login' ? <LoginForm /> : <RegisterForm />}
                    <div className="text-center mt-2 text-sm">
                      {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                      <button 
                        className="text-primary hover:underline"
                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      >
                         {authMode === 'login' ? "Sign up" : "Sign in"}
                      </button>
                    </div>
                  </DialogContent>
               </Dialog>
               <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setAuthMode('register')}>Sign up</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <RegisterForm />
                    <div className="text-center mt-2 text-sm">
                      Already have an account? <button className="text-primary hover:underline" onClick={() => setAuthMode('login')}>Sign in</button>
                    </div>
                  </DialogContent>
               </Dialog>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {'role' in user && (user as { role?: string }).role === 'admin' && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-amber-500">
                    <span>Admin</span>
                  </Button>
                </Link>
              )}
              <Link href="/habits">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span>Habits</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
              <SettingsDialog />
              <BrownNoiseToggle />
              <ThemeToggle />
              <span className="text-sm font-medium">{user.email}</span>
              <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center p-6 space-y-12">
        
        <Timer activeTask={activeTask} />

        <div className="w-full max-w-md">
          {user ? (
            <TaskList 
              activeTask={activeTask} 
              onActiveTaskChange={setActiveTask} 
            />
          ) : (
            <div className="text-center p-8 bg-card/30 backdrop-blur-sm rounded-xl border border-dashed">
              <h3 className="text-lg font-semibold mb-2">Sign in to manage tasks</h3>
              <p className="text-muted-foreground text-sm mb-4">Track your progress and sync across devices.</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setAuthMode('login')}>Login to OpenPomo</Button>
                </DialogTrigger>
                <DialogContent>
                  <LoginForm />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

      </div>

      <footer className="w-full py-6 text-center text-sm text-muted-foreground opacity-50">
        built with Next.js, Postgres & Prisma
      </footer>
    </main>
  );
}

