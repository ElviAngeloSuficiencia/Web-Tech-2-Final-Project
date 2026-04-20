import { Hono } from 'hono';
import { db } from '../db/mysql';

const authRoute = new Hono();

authRoute.post('/login', async (c) => {
  try {
    const body = await c.req.json();

    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!username || !password) {
      return c.json(
        {
          success: false,
          message: 'Username and password are required'
        },
        400
      );
    }

    const [rows]: any = await db.query(
      `SELECT
        admin_id,
        username,
        password_hash
       FROM admin_users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return c.json(
        {
          success: false,
          message: 'Invalid username or password'
        },
        401
      );
    }

    const admin = rows[0];

    // Temporary plain-text comparison for school/demo use
    if (admin.password_hash !== password) {
      return c.json(
        {
          success: false,
          message: 'Invalid username or password'
        },
        401
      );
    }

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        admin_id: admin.admin_id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('POST /login error:', error);

    return c.json(
      {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default authRoute;