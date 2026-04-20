import { Hono } from 'hono';
import { db } from '../db/mysql';

const membersRoute = new Hono();

membersRoute.get('/members', async (c) => {
  try {
    const [rows] = await db.query(
      `SELECT
        member_id,
        name,
        contact_number,
        email,
        remaining_time,
        status,
        created_at
       FROM members
       ORDER BY member_id DESC`
    );

    return c.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('GET /members error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to fetch members',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

membersRoute.post('/members', async (c) => {
  try {
    const body = await c.req.json();

    const name = String(body.name || '').trim();
    const contactNumber = String(body.contact_number || '').trim();
    const email = String(body.email || '').trim();
    const remainingTime = Number(body.remaining_time || 0);
    const status = String(body.status || 'active').trim();

    if (!name) {
      return c.json(
        {
          success: false,
          message: 'Name is required'
        },
        400
      );
    }

    const [result]: any = await db.query(
      `INSERT INTO members (
        name,
        contact_number,
        email,
        remaining_time,
        status
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        contactNumber || null,
        email || null,
        remainingTime,
        status || 'active'
      ]
    );

    const [rows]: any = await db.query(
      `SELECT
        member_id,
        name,
        contact_number,
        email,
        remaining_time,
        status,
        created_at
       FROM members
       WHERE member_id = ?`,
      [result.insertId]
    );

    return c.json(
      {
        success: true,
        message: 'Member added successfully',
        data: rows[0]
      },
      201
    );
  } catch (error) {
    console.error('POST /members error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to add member',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

membersRoute.delete('/members/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));

    if (!id) {
      return c.json(
        {
          success: false,
          message: 'Invalid member id'
        },
        400
      );
    }

    const [result]: any = await db.query(
      `DELETE FROM members WHERE member_id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return c.json(
        {
          success: false,
          message: 'Member not found'
        },
        404
      );
    }

    return c.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /members/:id error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to delete member',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default membersRoute;