import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return; 
    }
    
    let settings = await prisma.settings.findUnique({ where: { userId } });
    
    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.settings.create({
        data: { userId }
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const { pomodoroTime, shortBreakTime, longBreakTime, autoStart } = req.body;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return; 
    }

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {
        pomodoroTime,
        shortBreakTime,
        longBreakTime,
        autoStart
      },
      create: {
        userId,
        pomodoroTime,
        shortBreakTime,
        longBreakTime,
        autoStart
      }
    });
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
