import { Router } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get today's date at midnight (for consistent date comparison)
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// List all habits with today's completion status
router.get('/', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const today = getTodayDate();
    
    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        logs: {
          where: { date: today },
          take: 1
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform to include completedToday flag
    const habitsWithStatus = habits.map(habit => ({
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      completedToday: habit.logs.length > 0 && habit.logs[0].completed,
      createdAt: habit.createdAt
    }));

    res.json(habitsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new habit
router.post('/', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, emoji } = req.body;

    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Habit name is required' });
      return;
    }

    const habit = await prisma.habit.create({
      data: {
        name: name.trim(),
        emoji: emoji || '✅',
        userId
      }
    });

    res.json({
      id: habit.id,
      name: habit.name,
      emoji: habit.emoji,
      completedToday: false,
      createdAt: habit.createdAt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a habit
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, emoji } = req.body;

    const existing = await prisma.habit.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    const habit = await prisma.habit.update({
      where: { id: Number(id) },
      data: { name, emoji }
    });

    res.json(habit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a habit
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existing = await prisma.habit.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    await prisma.habit.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Toggle today's completion status
router.post('/:id/toggle', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const habitId = Number(id);
    const today = getTodayDate();

    const existing = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    // Check if there's already a log for today
    const existingLog = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date: today } }
    });

    if (existingLog) {
      // Toggle the completion status
      if (existingLog.completed) {
        // If completed, delete the log (uncheck)
        await prisma.habitLog.delete({ where: { id: existingLog.id } });
        res.json({ completedToday: false });
      } else {
        // If not completed, set to completed
        await prisma.habitLog.update({
          where: { id: existingLog.id },
          data: { completed: true }
        });
        res.json({ completedToday: true });
      }
    } else {
      // Create a new log entry
      await prisma.habitLog.create({
        data: { habitId, date: today, completed: true }
      });
      res.json({ completedToday: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get habit statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = (req as AuthRequest).auth?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const habits = await prisma.habit.findMany({
      where: { userId, archived: false },
      include: {
        logs: {
          where: { completed: true },
          orderBy: { date: 'desc' }
        }
      }
    });

    const today = getTodayDate();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats = habits.map(habit => {
      const logs = habit.logs;
      
      // Calculate current streak
      let currentStreak = 0;
      let checkDate = new Date(today);
      
      for (let i = 0; i < logs.length; i++) {
        const logDate = new Date(logs[i].date);
        logDate.setHours(0, 0, 0, 0);
        
        if (logDate.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (logDate.getTime() < checkDate.getTime()) {
          // Check if we missed today but have yesterday
          if (i === 0 && checkDate.getTime() === today.getTime()) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (logDate.getTime() === checkDate.getTime()) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      // Calculate best streak
      let bestStreak = 0;
      let tempStreak = 0;
      let prevDate: Date | null = null;

      for (const log of logs) {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);

        if (prevDate === null) {
          tempStreak = 1;
        } else {
          const diff = (prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        prevDate = logDate;
      }
      bestStreak = Math.max(bestStreak, tempStreak);

      // Calculate completion rates
      const last7Days = logs.filter(log => new Date(log.date) >= sevenDaysAgo).length;
      const last30Days = logs.filter(log => new Date(log.date) >= thirtyDaysAgo).length;

      // Get all log dates for calendar view
      const completedDates = logs.map(log => log.date.toISOString().split('T')[0]);

      return {
        id: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        currentStreak,
        bestStreak,
        completionRate7Days: Math.round((last7Days / 7) * 100),
        completionRate30Days: Math.round((last30Days / 30) * 100),
        completedDates
      };
    });

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
