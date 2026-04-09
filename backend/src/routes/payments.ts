import { Hono } from 'hono';
import { db } from '../db/mysql';

const paymentsRoute = new Hono();

paymentsRoute.post('/payments', async (c) => {
  try {
    const body = await c.req.json();

    const memberId = Number(body.member_id);
    const amount = Number(body.amount);
    const paymentMethod = body.payment_method?.trim() || 'Cash';
    const timeAddedMinutes = Number(body.time_added_minutes ?? 0);

    if (!memberId || amount <= 0 || timeAddedMinutes <= 0) {
      return c.json(
        {
          success: false,
          message: 'member_id, amount, and time_added_minutes are required'
        },
        400
      );
    }

    const [memberRows]: any = await db.query(
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
      [memberId]
    );

    if (!memberRows.length) {
      return c.json(
        {
          success: false,
          message: 'Member not found'
        },
        404
      );
    }

    const secondsToAdd = timeAddedMinutes * 60;

    await db.query(
      `UPDATE members
       SET remaining_time = remaining_time + ?
       WHERE member_id = ?`,
      [secondsToAdd, memberId]
    );

    const [insertResult]: any = await db.query(
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
        null,
        'topup',
        timeAddedMinutes,
        paymentMethod,
        amount
      ]
    );

    const [transactionRows]: any = await db.query(
      `SELECT
        transaction_id,
        member_id,
        computer_id,
        transaction_type,
        time_added,
        payment_method,
        amount,
        transaction_date
       FROM transactions
       WHERE transaction_id = ?`,
      [insertResult.insertId]
    );

    const [updatedMemberRows]: any = await db.query(
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
      [memberId]
    );

    return c.json({
      success: true,
      message: 'Payment successful',
      data: {
        transaction: transactionRows[0],
        member: updatedMemberRows[0]
      }
    });
  } catch (error) {
    console.error('POST /payments error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to process payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

paymentsRoute.get('/transactions', async (c) => {
  try {
    const [rows] = await db.query(
      `SELECT
        t.transaction_id,
        t.member_id,
        t.computer_id,
        t.transaction_type,
        t.time_added,
        t.payment_method,
        t.amount,
        t.transaction_date,
        m.name AS member_name
       FROM transactions t
       LEFT JOIN members m ON t.member_id = m.member_id
       ORDER BY t.transaction_date DESC, t.transaction_id DESC`
    );

    return c.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('GET /transactions error:', error);

    return c.json(
      {
        success: false,
        message: 'Failed to fetch transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default paymentsRoute;