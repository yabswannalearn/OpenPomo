import { PrismaClient } from '@prisma/client';

// Pass the URL explicitly to avoid config resolution issues in Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:reinael123@localhost:5432/pomodoro_db?schema=public",
    },
  },
});

export default prisma;
