import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// List tasks
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
    }
    
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
    }
    const { title, estPomodoros, projectId, note } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        estPomodoros: estPomodoros || 1,
        projectId: projectId || null,
        note,
        userId
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
    }
    const { id } = req.params;
    const { title, completed, actPomodoros, estPomodoros, note, projectId } = req.body;
    
    const existing = await prisma.task.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        completed,
        actPomodoros,
        estPomodoros,
        note,
        projectId
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    if (!userId) {
       res.status(401).json({ error: 'Unauthorized' });
       return;
    }
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
