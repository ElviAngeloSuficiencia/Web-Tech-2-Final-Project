import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from 'dotenv';
import { db } from './db/mysql';
import membersRoute from './routes/members';
import computersRoute from './routes/computers';
import paymentsRoute from './routes/payments';

config();

const app = new Hono();

app.use(
  '*',
  cors({
    origin: 'http://localhost:4200',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
);

app.get('/', (c) => {
  return c.json({
    message: 'Internet Cafe Hono API is running',
    status: 'success'
  });
});

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    message: 'API is healthy'
  });
});

app.get('/api/test-db', async (c) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS server_time');

    return c.json({
      success: true,
      message: 'Database connection is working',
      data: rows
    });
  } catch (error) {
    console.error('DB test failed:', error);

    return c.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

app.route('/api', membersRoute);
app.route('/api', computersRoute);
app.route('/api', paymentsRoute);

const port = Number(process.env.PORT) || 3000;

console.log(`Internet Cafe backend running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});