import express from 'express';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

interface FocusSession {
  id: number;
  type: string;
  duration: number;
}

// POST /sessions - Log a completed session
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, type, duration } = req.body as { taskId?: number; type?: string; duration: number };
    const userId = req.userId!;

    // Create the focus session
    const session = await prisma.focusSession.create({
      data: {
        userId,
        taskId: taskId || null,
        type: type || 'pomodoro',
        duration,
      },
    });

    // If it's a pomodoro session and linked to a task, increment actPomodoros
    if (type === 'pomodoro' && taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { actPomodoros: { increment: 1 } },
      });
    }

    res.status(201).json(session);
  } catch (err) {
    console.error('Failed to log session:', err);
    res.status(500).json({ error: 'Failed to log session' });
  }
});

// GET /sessions/today - Get today's sessions for analytics
router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await prisma.focusSession.findMany({
      where: {
        userId,
        completedAt: { gte: today },
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Calculate summary
    const pomodoroSessions = sessions.filter((s: FocusSession) => s.type === 'pomodoro');
    const totalMinutes = pomodoroSessions.reduce((sum: number, s: FocusSession) => sum + s.duration, 0);

    res.json({
      sessions,
      summary: {
        totalPomodoros: pomodoroSessions.length,
        totalMinutes,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      },
    });
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /sessions/stats - Dashboard analytics with aggregated stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Parse date range from query params
    const range = (req.query.range as string) || '7days';
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Calculate date range
    let rangeStart: Date;
    switch (range) {
      case '30days':
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 30);
        break;
      case 'month':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        rangeStart = new Date(2020, 0, 1); // Far back enough
        break;
      default: // 7days
        rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
    }
    rangeStart.setHours(0, 0, 0, 0);
    
    // Also get yesterday's data for comparison
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const lastWeekStart = new Date(todayStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const twoWeeksAgo = new Date(todayStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Fetch sessions for the selected range + extra for comparisons
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    const allSessions = await prisma.focusSession.findMany({
      where: {
        userId,
        completedAt: { gte: yearAgo },
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Filter pomodoro sessions
    const pomodoroSessions = allSessions.filter((s: any) => s.type === 'pomodoro');
    const rangeSessions = pomodoroSessions.filter((s: any) => new Date(s.completedAt) >= rangeStart);
    
    // Today's stats
    const todaySessions = pomodoroSessions.filter((s: any) => new Date(s.completedAt) >= todayStart);
    const todayPomodoros = todaySessions.length;
    const todayMinutes = todaySessions.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Yesterday's stats (for comparison)
    const yesterdaySessions = pomodoroSessions.filter((s: any) => {
      const d = new Date(s.completedAt);
      return d >= yesterdayStart && d < todayStart;
    });
    const yesterdayPomodoros = yesterdaySessions.length;

    // This week's stats
    const weekSessions = pomodoroSessions.filter((s: any) => new Date(s.completedAt) >= lastWeekStart);
    const weekPomodoros = weekSessions.length;
    const weekMinutes = weekSessions.reduce((sum: number, s: any) => sum + s.duration, 0);

    // Last week's stats (for comparison)
    const prevWeekSessions = pomodoroSessions.filter((s: any) => {
      const d = new Date(s.completedAt);
      return d >= twoWeeksAgo && d < lastWeekStart;
    });
    const prevWeekPomodoros = prevWeekSessions.length;

    // Daily breakdown for selected range (up to 30 days)
    const daysToShow = Math.min(30, Math.ceil((now.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyBreakdown: { date: string; count: number; minutes: number }[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const daySessions = pomodoroSessions.filter((s: any) => {
        const completedAt = new Date(s.completedAt);
        return completedAt >= date && completedAt < nextDate;
      });
      
      dailyBreakdown.push({
        date: date.toISOString().split('T')[0],
        count: daySessions.length,
        minutes: daySessions.reduce((sum: number, s: any) => sum + s.duration, 0),
      });
    }

    // Hourly distribution (which hours are most productive)
    const hourlyDistribution: { hour: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const count = rangeSessions.filter((s: any) => new Date(s.completedAt).getHours() === h).length;
      hourlyDistribution.push({ hour: h, count });
    }

    // Task distribution for donut chart
    const taskDistribution: { name: string; value: number; minutes: number }[] = [];
    const taskCounts: Record<string, { name: string; count: number; minutes: number }> = {};
    rangeSessions.forEach((s: any) => {
      const name = s.task?.title || 'Unassigned';
      if (!taskCounts[name]) {
        taskCounts[name] = { name, count: 0, minutes: 0 };
      }
      taskCounts[name].count++;
      taskCounts[name].minutes += s.duration;
    });
    Object.values(taskCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // Top 8 for donut chart
      .forEach(t => taskDistribution.push({ name: t.name, value: t.count, minutes: t.minutes }));

    // Yearly heatmap data (last 365 days)
    const heatmapData: { date: string; count: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = pomodoroSessions.filter((s: any) => {
        const d = new Date(s.completedAt);
        return d >= date && d < nextDate;
      }).length;
      
      heatmapData.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    // Calculate streak
    let streak = 0;
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    
    while (true) {
      const nextDate = new Date(checkDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const hasSession = pomodoroSessions.some((s: any) => {
        const completedAt = new Date(s.completedAt);
        return completedAt >= checkDate && completedAt < nextDate;
      });
      
      if (hasSession) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (streak === 0 && checkDate.getTime() === todayStart.getTime()) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Top tasks
    const topTasks = Object.values(taskCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(t => ({ id: 0, title: t.name, count: t.count }));

    // Recent sessions
    const recentSessions = allSessions.slice(0, 10).map((s: any) => ({
      id: s.id,
      type: s.type,
      duration: s.duration,
      completedAt: s.completedAt,
      task: s.task,
    }));

    // Calculate comparison percentages
    const todayVsYesterday = yesterdayPomodoros > 0 
      ? Math.round(((todayPomodoros - yesterdayPomodoros) / yesterdayPomodoros) * 100) 
      : todayPomodoros > 0 ? 100 : 0;
    
    const weekVsLastWeek = prevWeekPomodoros > 0 
      ? Math.round(((weekPomodoros - prevWeekPomodoros) / prevWeekPomodoros) * 100) 
      : weekPomodoros > 0 ? 100 : 0;

    res.json({
      today: {
        pomodoros: todayPomodoros,
        minutes: todayMinutes,
        hours: Math.round(todayMinutes / 60 * 10) / 10,
        vsYesterday: todayVsYesterday,
      },
      week: {
        pomodoros: weekPomodoros,
        minutes: weekMinutes,
        hours: Math.round(weekMinutes / 60 * 10) / 10,
        vsLastWeek: weekVsLastWeek,
      },
      dailyBreakdown,
      hourlyDistribution,
      taskDistribution,
      heatmapData,
      streak,
      topTasks,
      recentSessions,
    });
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

