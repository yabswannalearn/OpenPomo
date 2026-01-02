"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Loader2, Flame, Trophy, Calendar } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import apiClient from "@/lib/apiClient";
import Link from "next/link";

interface HabitStats {
  id: number;
  name: string;
  emoji: string;
  currentStreak: number;
  bestStreak: number;
  completionRate7Days: number;
  completionRate30Days: number;
  completedDates: string[];
}

export default function HabitsStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<HabitStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get("/habits/stats");
      setStats(res.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate last 30 days for calendar
  const getLast30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const last30Days = getLast30Days();

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/90 to-primary/5 text-foreground">
      {/* Header */}
      <header className="w-full flex items-center justify-between p-6 max-w-5xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/habits">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tighter">Habit Stats</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-2xl mx-auto p-6 space-y-6">
        {stats.length === 0 ? (
          <div className="text-center p-8 bg-card/30 backdrop-blur-sm rounded-xl border border-dashed">
            <p className="text-muted-foreground">No habits to show stats for</p>
            <Link href="/habits">
              <Button variant="link" className="mt-2">Add some habits first</Button>
            </Link>
          </div>
        ) : (
          stats.map((habit) => (
            <div
              key={habit.id}
              className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border space-y-4"
            >
              {/* Habit Header */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{habit.emoji}</span>
                <h2 className="text-lg font-semibold">{habit.name}</h2>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 text-orange-500 mb-1">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-medium">Current</span>
                  </div>
                  <span className="text-2xl font-bold">{habit.currentStreak}</span>
                  <span className="text-xs text-muted-foreground block">days</span>
                </div>

                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 text-yellow-500 mb-1">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs font-medium">Best</span>
                  </div>
                  <span className="text-2xl font-bold">{habit.bestStreak}</span>
                  <span className="text-xs text-muted-foreground block">days</span>
                </div>

                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 text-blue-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-medium">7 Days</span>
                  </div>
                  <span className="text-2xl font-bold">{habit.completionRate7Days}%</span>
                </div>

                <div className="p-3 bg-background/50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 text-purple-500 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-medium">30 Days</span>
                  </div>
                  <span className="text-2xl font-bold">{habit.completionRate30Days}%</span>
                </div>
              </div>

              {/* Calendar Heatmap */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Last 30 Days</h3>
                <div className="grid grid-cols-10 gap-1">
                  {last30Days.map((date) => {
                    const isCompleted = habit.completedDates.includes(date);
                    return (
                      <div
                        key={date}
                        className={`aspect-square rounded-sm transition-colors ${
                          isCompleted
                            ? "bg-primary"
                            : "bg-muted/30"
                        }`}
                        title={`${date}: ${isCompleted ? "Completed" : "Not completed"}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
