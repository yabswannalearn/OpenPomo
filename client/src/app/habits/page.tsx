"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Plus, Trash2, BarChart3, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import apiClient from "@/lib/apiClient";
import Link from "next/link";

interface Habit {
  id: number;
  name: string;
  emoji: string;
  completedToday: boolean;
  createdAt: string;
}

export default function HabitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("✅");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchHabits();
    }
  }, [user]);

  const fetchHabits = async () => {
    try {
      const res = await apiClient.get("/habits");
      setHabits(res.data);
    } catch (error) {
      console.error("Failed to fetch habits:", error);
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post("/habits", {
        name: newHabitName.trim(),
        emoji: newHabitEmoji || "✅"
      });
      setHabits([...habits, res.data]);
      setNewHabitName("");
      setNewHabitEmoji("✅");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Failed to add habit:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleHabit = async (habitId: number) => {
    try {
      const res = await apiClient.post(`/habits/${habitId}/toggle`);
      setHabits(habits.map(h => 
        h.id === habitId ? { ...h, completedToday: res.data.completedToday } : h
      ));
    } catch (error) {
      console.error("Failed to toggle habit:", error);
    }
  };

  const deleteHabit = async (habitId: number) => {
    try {
      await apiClient.delete(`/habits/${habitId}`);
      setHabits(habits.filter(h => h.id !== habitId));
    } catch (error) {
      console.error("Failed to delete habit:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const completedCount = habits.filter(h => h.completedToday).length;
  const totalCount = habits.length;

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/90 to-primary/5 text-foreground">
      {/* Header */}
      <header className="w-full flex items-center justify-between p-6 max-w-5xl mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tighter">Habits</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link href="/habits/stats">
            <Button variant="ghost" size="sm" className="flex items-center space-x-1">
              <BarChart3 className="h-4 w-4" />
              <span>Stats</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-md mx-auto p-6">
        {/* Progress Summary */}
        <div className="mb-6 p-4 bg-card/50 backdrop-blur-sm rounded-xl border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today&apos;s Progress</span>
            <span className="text-lg font-bold">
              {completedCount}/{totalCount}
            </span>
          </div>
          {totalCount > 0 && (
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Habit List */}
        <div className="space-y-2">
          {habits.length === 0 ? (
            <div className="text-center p-8 bg-card/30 backdrop-blur-sm rounded-xl border border-dashed">
              <p className="text-muted-foreground mb-4">No habits yet</p>
              <p className="text-sm text-muted-foreground">Add your first habit to start tracking!</p>
            </div>
          ) : (
            habits.map((habit) => (
              <div
                key={habit.id}
                className={`flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm rounded-xl border transition-all duration-200 ${
                  habit.completedToday ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={habit.completedToday}
                    onCheckedChange={() => toggleHabit(habit.id)}
                    className="h-5 w-5"
                  />
                  <span className="text-lg">{habit.emoji}</span>
                  <span className={`font-medium ${habit.completedToday ? "line-through text-muted-foreground" : ""}`}>
                    {habit.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteHabit(habit.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Habit Button */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mt-6" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Emoji"
                  value={newHabitEmoji}
                  onChange={(e) => setNewHabitEmoji(e.target.value)}
                  className="w-16 text-center text-lg"
                  maxLength={2}
                />
                <Input
                  placeholder="Habit name"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit()}
                  className="flex-1"
                  autoFocus
                />
              </div>
              <Button 
                className="w-full" 
                onClick={addHabit}
                disabled={!newHabitName.trim() || submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
