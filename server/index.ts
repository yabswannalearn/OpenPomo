import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import prisma from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};

app.use(cors(corsOptions));
app.use((express as any).json());

// Health Check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).send('OK');
});

// Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import settingsRoutes from './routes/settings.js';
import sessionRoutes from './routes/sessions.js';

app.use('/api/auth', authRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/sessions', requireAuth, sessionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
