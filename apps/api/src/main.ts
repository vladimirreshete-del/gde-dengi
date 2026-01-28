import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
// Fix: Use standard named import for PrismaClient which is the recommended way for modern TypeScript and ESM environments.
import { PrismaClient } from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
// Added explicit import of process to resolve typing error: Property 'exit' does not exist on type 'Process'.
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Environment
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'secret';
// На Render в продакшене используем относительные пути, в деве — локалхост
const WEBAPP_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173';

// Initialize Bot
if (BOT_TOKEN) {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Где мои деньги?... 💰\nТвой личный контроль бюджета прямо в Telegram.", {
      reply_markup: {
        inline_keyboard: [[
          { text: "Открыть приложение 📱", web_app: { url: WEBAPP_URL } }
        ]]
      }
    });
  });
}

// Fastify Plugins
fastify.register(cors, { origin: true, credentials: true });
fastify.register(cookie);
fastify.register(jwt, { secret: ADMIN_JWT_SECRET });

// Serve Static Files (Frontend)
// В режиме продакшена файлы лежат в корневой папке dist после vite build
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../../../dist'),
  prefix: '/',
});

// Middlewares
const verifyTelegramAuth = async (request: any, reply: any) => {
  const initData = request.headers['x-telegram-init-data'];
  if (!initData) return reply.status(401).send({ error: 'Missing init data' });

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const sortedParams = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(sortedParams).digest('hex');

  if (calculatedHash !== hash) {
    return reply.status(403).send({ error: 'Invalid auth' });
  }

  const userRaw = JSON.parse(urlParams.get('user') || '{}');
  request.tgUser = userRaw;
};

// Health
fastify.get('/health', async () => ({ status: 'ok' }));

// --- API Routes ---
fastify.get('/api/me', { preHandler: [verifyTelegramAuth] }, async (request: any) => {
  const tgUser = request.tgUser;
  let user = await prisma.user.findUnique({
    where: { id: BigInt(tgUser.id) },
    include: { subscription: true, profile: true }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: BigInt(tgUser.id),
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: tgUser.photo_url,
        subscription: { create: { plan: 'FREE' } },
        profile: { create: { currency: 'RUB', monthlyIncome: 50000, paydayDay: 1 } }
      },
      include: { subscription: true, profile: true }
    });
  }

  return { data: user };
});

fastify.post('/api/expenses', { preHandler: [verifyTelegramAuth] }, async (request: any) => {
  const { amount, category, note, spentAt } = request.body;
  const userId = BigInt(request.tgUser.id);

  const expense = await prisma.expense.create({
    data: { 
      userId, 
      amount: parseFloat(amount), 
      category, 
      note, 
      spentAt: spentAt ? new Date(spentAt) : new Date() 
    }
  });
  return { data: expense };
});

fastify.get('/api/stats', { preHandler: [verifyTelegramAuth] }, async (request: any) => {
  const userId = BigInt(request.tgUser.id);
  const profile = await prisma.profile.findUnique({ where: { userId } });
  
  if (!profile) return { error: 'Profile not found' };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  let nextPayday = new Date(year, month, profile.paydayDay);
  if (today.getDate() >= profile.paydayDay) {
    nextPayday = new Date(year, month + 1, profile.paydayDay);
  }
  
  const msInDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(1, Math.ceil((nextPayday.getTime() - today.getTime()) / msInDay));

  const monthStart = new Date(year, month, 1);
  const expenses = await prisma.expense.findMany({
    where: { userId, spentAt: { gte: monthStart }, deletedAt: null }
  });

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remainingBudget = Math.max(0, profile.monthlyIncome - totalSpent);
  const dailyLimit = remainingBudget / daysRemaining;

  const spentToday = expenses
    .filter(e => e.spentAt.toDateString() === today.toDateString())
    .reduce((acc, curr) => acc + curr.amount, 0);

  return {
    data: {
      daysRemaining,
      dailyLimit,
      spentToday,
      remainingInLimit: dailyLimit - spentToday,
      totalSpentThisMonth: totalSpent,
      totalIncome: profile.monthlyIncome
    }
  };
});

// SPA fallback: любой маршрут, не начинающийся с /api или не являющийся файлом, отдает index.html
fastify.setNotFoundHandler((request, reply) => {
  if (request.raw.url?.startsWith('/api')) {
    reply.status(404).send({ error: 'API route not found' });
  } else {
    reply.sendFile('index.html');
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    // Explicitly using the imported process to call exit(1) to resolve the 'Property exit does not exist' error.
    process.exit(1);
  }
};
start();