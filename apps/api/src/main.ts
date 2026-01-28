
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
// Fix: Use default import for @prisma/client to resolve "no exported member PrismaClient" error in some ESM environments
import PrismaClientPkg from '@prisma/client';
const { PrismaClient } = PrismaClientPkg;
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'node:process';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// --- BigInt Serialization Fix ---
// Fastify (JSON.stringify) doesn't know how to handle BigInt by default.
// This ensures BigInt fields are sent as strings in JSON responses.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Environment
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'secret';
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

// AI Financial Advice Route using Gemini API
fastify.get('/api/ai/advice', { preHandler: [verifyTelegramAuth] }, async (request: any) => {
  const userId = BigInt(request.tgUser.id);
  const expenses = await prisma.expense.findMany({
    where: { userId, deletedAt: null },
    take: 20,
    orderBy: { spentAt: 'desc' }
  });

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй эти траты и дай 3 коротких, полезных совета по экономии на русском языке. Будь кратким: ${JSON.stringify(expenses)}`,
    config: {
      systemInstruction: "Ты - профессиональный финансовый консультант. Твои советы должны быть практическими, дружелюбными и очень короткими.",
    }
  });

  return { data: response.text };
});

// SPA fallback
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
    process.exit(1);
  }
};
start();
