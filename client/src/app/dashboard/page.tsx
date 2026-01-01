"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiClient } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { ArrowLeft, Flame, Clock, Target, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  today: { pomodoros: number; minutes: number; hours: number; vsYesterday: number };
  week: { pomodoros: number; minutes: number; hours: number; vsLastWeek: number };
  dailyBreakdown: { date: string; count: number; minutes: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  taskDistribution: { name: string; value: number; minutes: number }[];
  heatmapData: { date: string; count: number }[];
  streak: number;
  topTasks: { id: number; title: string; count: number }[];
  recentSessions: {
    id: number;
    type: string;
    duration: number;
    completedAt: string;
    task: { id: number; title: string } | null;
  }[];
}

const COLORS = ['#f43f5e', '#14b8a6', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#22c55e', '#06b6d4'];

// Comparison indicator component
function ComparisonBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}% {label}
    </span>
  );
}

// Heatmap component
function ActivityHeatmap({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return 'bg-rose-500/30';
    if (intensity < 0.5) return 'bg-rose-500/50';
    if (intensity < 0.75) return 'bg-rose-500/70';
    return 'bg-rose-500';
  };

  // Group by weeks (7 days per column)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = '';
  data.forEach((d, i) => {
    const month = new Date(d.date).toLocaleDateString('en-US', { month: 'short' });
    if (month !== lastMonth) {
      monthLabels.push({ label: month, weekIndex: Math.floor(i / 7) });
      lastMonth = month;
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5 text-xs text-muted-foreground pl-4">
        {monthLabels.map((m, i) => (
          <span key={i} style={{ marginLeft: i === 0 ? 0 : `${(m.weekIndex - (monthLabels[i-1]?.weekIndex || 0) - 1) * 12}px` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, _di) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)} transition-colors`}
                title={`${day.date}: ${day.count} pomodoros`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-rose-500/30" />
          <div className="w-3 h-3 rounded-sm bg-rose-500/50" />
          <div className="w-3 h-3 rounded-sm bg-rose-500/70" />
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const apiClient = useApiClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7days');

  useEffect(() => {
    if (!user) return;
    
    const fetchStats = async () => {
      try {
        const response = await apiClient.get(`/sessions/stats?range=${dateRange}`);
        setStats(response.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('Failed to load dashboard data');
      }
    };
    
    fetchStats();
  }, [user, apiClient, dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/5">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background/90 to-primary/5">
        <h2 className="text-xl font-semibold mb-4">Please log in to view your dashboard</h2>
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    );
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
  };

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background/90 to-primary/5 text-foreground">
      {/* Header */}
      <header className="w-full flex items-center justify-between p-6 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Timer</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tighter">Dashboard</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-6 pb-12 space-y-6">
        {error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : !stats || !stats.today || !stats.week ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading stats...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-rose-500/10">
                    <Target className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.today.pomodoros}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                    <ComparisonBadge value={stats.today.vsYesterday} label="vs yesterday" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-teal-500/10">
                    <TrendingUp className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.week.pomodoros}</p>
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <ComparisonBadge value={stats.week.vsLastWeek} label="vs last week" />
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.week.hours}h</p>
                    <p className="text-xs text-muted-foreground">Focus Time</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-orange-500/10">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.streak}</p>
                    <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Peak Hours Chart */}
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <h2 className="text-lg font-semibold mb-4">Peak Productivity Hours</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.hourlyDistribution}>
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatHour}
                      tick={{ fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value?: number) => [`${value ?? 0} pomodoros`, 'Count']}
                      labelFormatter={(hour?: number) => formatHour(hour ?? 0)}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Task Distribution Donut */}
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <h2 className="text-lg font-semibold mb-4">Task Distribution</h2>
                {stats.taskDistribution.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No tasks tracked yet
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={stats.taskDistribution}
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {stats.taskDistribution.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value?: number, name?: string) => [`${value ?? 0} pomodoros`, name ?? '']}
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1 max-h-[140px] overflow-y-auto">
                      {stats.taskDistribution.map((task, i) => (
                        <div key={task.name} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="truncate flex-1">{task.name}</span>
                          <span className="text-muted-foreground">{task.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Yearly Heatmap */}
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Activity Heatmap</h2>
                <span className="text-sm text-muted-foreground">(Last 365 days)</span>
              </div>
              <ActivityHeatmap data={stats.heatmapData} />
            </Card>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Tasks */}
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <h2 className="text-lg font-semibold mb-4">Top Tasks</h2>
                {stats.topTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks tracked yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topTasks.map((task, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-muted-foreground w-5">{i + 1}.</span>
                          <span className="text-sm truncate max-w-[180px]">{task.title}</span>
                        </div>
                        <span className="text-sm font-medium text-rose-500">{task.count} 🍅</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Sessions */}
              <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
                {stats.recentSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions recorded yet</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {stats.recentSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            session.type === 'pomodoro' ? 'bg-rose-500' : 
                            session.type === 'shortBreak' ? 'bg-teal-500' : 'bg-blue-500'
                          }`} />
                          <span className="truncate max-w-[140px]">
                            {session.task?.title || (session.type === 'pomodoro' ? 'Focus' : session.type === 'shortBreak' ? 'Short Break' : 'Long Break')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-muted-foreground">
                          <span>{session.duration}m</span>
                          <span>{new Date(session.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
