import { Hono } from 'hono';
import { db } from '../db/mysql';

const computersRoute = new Hono();

computersRoute.get('/computers', async (c) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        c.computer_id,
        c.computer_name,
        c.status,
        c.member_id,
        c.customer_name,
        c.time_started,
        c.time_ended,
        c.remaining_seconds,
        c.amount_paid,
        m.name AS member_name
       FROM computers c
       LEFT JOIN members m ON c.member_id = m.member_id
       ORDER BY c.computer_id ASC`
    );

    return c.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('GET /computers error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to fetch computers',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

computersRoute.get('/computers/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const [rows]: any = await db.query(
      `SELECT 
        c.computer_id,
        c.computer_name,
        c.status,
        c.member_id,
        c.customer_name,
        c.time_started,
        c.time_ended,
        c.remaining_seconds,
        c.amount_paid,
        m.name AS member_name
       FROM computers c
       LEFT JOIN members m ON c.member_id = m.member_id
       WHERE c.computer_id = ?`,
      [id]
    );

    if (!rows.length) {
      return c.json(
        {
          success: false,
          message: 'Computer not found',
        },
        404
      );
    }

    return c.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('GET /computers/:id error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to fetch computer',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

computersRoute.post('/computers', async (c) => {
  try {
    const body = await c.req.json();

    const computerName = body.computer_name?.trim();

    if (!computerName) {
      return c.json(
        {
          success: false,
          message: 'computer_name is required',
        },
        400
      );
    }

    const [result]: any = await db.query(
      `INSERT INTO computers (
        computer_name,
        status,
        member_id,
        customer_name,
        time_started,
        time_ended,
        remaining_seconds,
        amount_paid
      ) VALUES (?, 'available', NULL, NULL, NULL, NULL, 0, 0)`,
      [computerName]
    );

    const [newRows]: any = await db.query(
      `SELECT 
        computer_id,
        computer_name,
        status,
        member_id,
        customer_name,
        time_started,
        time_ended,
        remaining_seconds,
        amount_paid
       FROM computers
       WHERE computer_id = ?`,
      [result.insertId]
    );

    return c.json(
      {
        success: true,
        message: 'Computer added successfully',
        data: newRows[0],
      },
      201
    );
  } catch (error) {
    console.error('POST /computers error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to add computer',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

computersRoute.patch('/computers/:id/start', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const memberId = body.member_id ?? null;
    const customerName = body.customer_name?.trim() || null;
    const amountPaid = Number(body.amount_paid ?? 0);
    const remainingSeconds = Number(body.remaining_seconds ?? 0);

    if (!memberId && !customerName) {
      return c.json(
        {
          success: false,
          message: 'member_id or customer_name is required',
        },
        400
      );
    }

    if (remainingSeconds <= 0) {
      return c.json(
        {
          success: false,
          message: 'remaining_seconds must be greater than 0',
        },
        400
      );
    }

    const [computerRows]: any = await db.query(
      `SELECT * FROM computers WHERE computer_id = ?`,
      [id]
    );

    if (!computerRows.length) {
      return c.json(
        {
          success: false,
          message: 'Computer not found',
        },
        404
      );
    }

    const computer = computerRows[0];

    if (computer.status === 'occupied') {
      return c.json(
        {
          success: false,
          message: 'Computer is already occupied',
        },
        400
      );
    }

    if (memberId) {
      const [memberRows]: any = await db.query(
        `SELECT * FROM members WHERE member_id = ?`,
        [memberId]
      );

      if (!memberRows.length) {
        return c.json(
          {
            success: false,
            message: 'Member not found',
          },
          404
        );
      }
    }

    await db.query(
      `UPDATE computers
       SET status = 'occupied',
           member_id = ?,
           customer_name = ?,
           time_started = NOW(),
           time_ended = NULL,
           remaining_seconds = ?,
           amount_paid = ?
       WHERE computer_id = ?`,
      [memberId, customerName, remainingSeconds, amountPaid, id]
    );

    await db.query(
      `INSERT INTO transactions (
        member_id,
        computer_id,
        transaction_type,
        time_added,
        payment_method,
        amount
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        memberId,
        id,
        'session_start',
        Math.floor(remainingSeconds / 60),
        body.payment_method?.trim() || 'Cash',
        amountPaid,
      ]
    );

    const [updatedRows]: any = await db.query(
      `SELECT 
        c.computer_id,
        c.computer_name,
        c.status,
        c.member_id,
        c.customer_name,
        c.time_started,
        c.time_ended,
        c.remaining_seconds,
        c.amount_paid,
        m.name AS member_name
       FROM computers c
       LEFT JOIN members m ON c.member_id = m.member_id
       WHERE c.computer_id = ?`,
      [id]
    );

    return c.json({
      success: true,
      message: 'Session started successfully',
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('PATCH /computers/:id/start error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to start session',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

computersRoute.patch('/computers/:id/end', async (c) => {
  try {
    const id = c.req.param('id');

    const [computerRows]: any = await db.query(
      `SELECT * FROM computers WHERE computer_id = ?`,
      [id]
    );

    if (!computerRows.length) {
      return c.json(
        {
          success: false,
          message: 'Computer not found',
        },
        404
      );
    }

    const computer = computerRows[0];

    if (computer.status !== 'occupied') {
      return c.json(
        {
          success: false,
          message: 'Computer is not occupied',
        },
        400
      );
    }

    await db.query(
      `UPDATE computers
       SET status = 'available',
           member_id = NULL,
           customer_name = NULL,
           time_ended = NOW(),
           remaining_seconds = 0,
           amount_paid = 0
       WHERE computer_id = ?`,
      [id]
    );

    await db.query(
      `INSERT INTO transactions (
        member_id,
        computer_id,
        transaction_type,
        time_added,
        payment_method,
        amount
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        computer.member_id,
        id,
        'session_end',
        0,
        'System',
        0,
      ]
    );

    const [updatedRows]: any = await db.query(
      `SELECT 
        computer_id,
        computer_name,
        status,
        member_id,
        customer_name,
        time_started,
        time_ended,
        remaining_seconds,
        amount_paid
       FROM computers
       WHERE computer_id = ?`,
      [id]
    );

    return c.json({
      success: true,
      message: 'Session ended successfully',
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('PATCH /computers/:id/end error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to end session',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

computersRoute.patch('/computers/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const status = body.status?.trim();

    const allowedStatuses = ['available', 'occupied', 'maintenance', 'offline'];

    if (!status || !allowedStatuses.includes(status)) {
      return c.json(
        {
          success: false,
          message: 'Invalid status',
        },
        400
      );
    }

    const [computerRows]: any = await db.query(
      `SELECT * FROM computers WHERE computer_id = ?`,
      [id]
    );

    if (!computerRows.length) {
      return c.json(
        {
          success: false,
          message: 'Computer not found',
        },
        404
      );
    }

    if (status !== 'occupied') {
      await db.query(
        `UPDATE computers
         SET status = ?,
             member_id = NULL,
             customer_name = NULL,
             time_started = NULL,
             time_ended = NULL,
             remaining_seconds = 0,
             amount_paid = 0
         WHERE computer_id = ?`,
        [status, id]
      );
    } else {
      await db.query(
        `UPDATE computers
         SET status = ?
         WHERE computer_id = ?`,
        [status, id]
      );
    }

    const [updatedRows]: any = await db.query(
      `SELECT 
        computer_id,
        computer_name,
        status,
        member_id,
        customer_name,
        time_started,
        time_ended,
        remaining_seconds,
        amount_paid
       FROM computers
       WHERE computer_id = ?`,
      [id]
    );

    return c.json({
      success: true,
      message: 'Computer status updated successfully',
      data: updatedRows[0],
    });
  } catch (error) {
    console.error('PATCH /computers/:id/status error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to update computer status',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default computersRoute;