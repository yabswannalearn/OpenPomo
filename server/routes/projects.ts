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
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const { name, color } = req.body;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return; 
    }

    const project = await prisma.project.create({
      data: {
        name,
        color,
        userId
      }
    });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).auth.userId;
    const { id } = req.params;
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return; 
    }

    const existing = await prisma.project.findUnique({ where: { id: Number(id) } });
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: 'Project not found' });
      return; 
    }

    await prisma.project.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
