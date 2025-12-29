import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import prisma from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration for production
const allowedOrigins = process.env.CORS_ORIGIN 
  ? [process.env.CORS_ORIGIN] 
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || !process.env.CORS_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now during debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
