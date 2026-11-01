const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seedDatabase() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // Clean existing data for clean re-seed if desired
    await client.query(`
      TRUNCATE organization_settings, notifications, service_events, queue_tokens, counters, services, users, organizations CASCADE;
    `);

    // 1. Organization
    const orgRes = await client.query(`
      INSERT INTO organizations (organization_name, slug)
      VALUES ($1, $2)
      RETURNING organization_id;
    `, ['Apex Engineering Institute', 'apex-college']);
    const orgId = orgRes.rows[0].organization_id;

    // 2. Organization Settings
    await client.query(`
      INSERT INTO organization_settings (organization_id, auto_call_next, turn_approaching_threshold, operating_hours_start, operating_hours_end)
      VALUES ($1, $2, $3, $4, $5);
    `, [orgId, false, 2, '08:30:00', '17:30:00']);

    // Passwords
    const adminPass = await bcrypt.hash('admin123', 10);
    const opPass = await bcrypt.hash('operator123', 10);
    const visPass = await bcrypt.hash('visitor123', 10);

    // 3. Users
    const adminUser = await client.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, 'Prof. Richard Vance (Admin)', 'admin@ghostqueue.io', $2, 'admin')
      RETURNING user_id;
    `, [orgId, adminPass]);

    const op1 = await client.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, 'Elena Rostova (Operator 1)', 'operator1@ghostqueue.io', $2, 'operator')
      RETURNING user_id;
    `, [orgId, opPass]);

    const op2 = await client.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, 'Marcus Brody (Operator 2)', 'operator2@ghostqueue.io', $2, 'operator')
      RETURNING user_id;
    `, [orgId, opPass]);

    const op3 = await client.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, 'Sarah Lin (Operator 3)', 'operator3@ghostqueue.io', $2, 'operator')
      RETURNING user_id;
    `, [orgId, opPass]);

    const visitorUser = await client.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role)
      VALUES ($1, 'Aarav Sharma (Visitor)', 'visitor@ghostqueue.io', $2, 'visitor')
      RETURNING user_id;
    `, [orgId, visPass]);

    // 4. Services
    const s1 = await client.query(`
      INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
      VALUES ($1, 'Admissions & Enrollment', 'ADM', 'Course registration, credential verification, and student admissions processing.', 'GraduationCap', 8)
      RETURNING service_id;
    `, [orgId]);

    const s2 = await client.query(`
      INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
      VALUES ($1, 'Student Accounts & Billing', 'ACC', 'Fee clearance, scholarship disbursement, and payment receipts.', 'DollarSign', 6)
      RETURNING service_id;
    `, [orgId]);

    const s3 = await client.query(`
      INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
      VALUES ($1, 'Examination & Degree Office', 'EXM', 'Transcript requests, hall tickets, grade review, and graduation certificates.', 'FileText', 10)
      RETURNING service_id;
    `, [orgId]);

    const s4 = await client.query(`
      INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
      VALUES ($1, 'IT & Lab Helpdesk', 'LAB', 'Campus network access, workstation support, and software license keys.', 'Monitor', 12)
      RETURNING service_id;
    `, [orgId]);

    const s5 = await client.query(`
      INSERT INTO services (organization_id, service_name, service_code, description, icon, default_service_duration)
      VALUES ($1, 'General Student Welfare', 'GEN', 'Hostel accommodation, transport pass, and student counseling inquiries.', 'LifeBuoy', 7)
      RETURNING service_id;
    `, [orgId]);

    const admId = s1.rows[0].service_id;
    const accId = s2.rows[0].service_id;
    const exmId = s3.rows[0].service_id;
    const labId = s4.rows[0].service_id;

    // 5. Counters
    const c1 = await client.query(`
      INSERT INTO counters (organization_id, service_id, counter_name, counter_number, operator_id, status)
      VALUES ($1, $2, 'Counter 1 (Admissions)', 1, $3, 'active')
      RETURNING counter_id;
    `, [orgId, admId, op1.rows[0].user_id]);

    const c2 = await client.query(`
      INSERT INTO counters (organization_id, service_id, counter_name, counter_number, operator_id, status)
      VALUES ($1, $2, 'Counter 2 (Accounts)', 2, $3, 'active')
      RETURNING counter_id;
    `, [orgId, accId, op2.rows[0].user_id]);

    const c3 = await client.query(`
      INSERT INTO counters (organization_id, service_id, counter_name, counter_number, operator_id, status)
      VALUES ($1, $2, 'Counter 3 (Examinations)', 3, $3, 'active')
      RETURNING counter_id;
    `, [orgId, exmId, op3.rows[0].user_id]);

    const c4 = await client.query(`
      INSERT INTO counters (organization_id, service_id, counter_name, counter_number, operator_id, status)
      VALUES ($1, $2, 'Counter 4 (IT Support)', 4, NULL, 'closed')
      RETURNING counter_id;
    `, [orgId, labId]);

    // 6. Historical completed tokens for realistic prediction calculations & analytics
    console.log('📊 Seeding initial historical completed records for prediction engine...');
    const now = new Date();
    const mockCompleted = [
      { code: 'ADM', sId: admId, cId: c1.rows[0].counter_id, opId: op1.rows[0].user_id, waitMin: 12, servMin: 7 },
      { code: 'ADM', sId: admId, cId: c1.rows[0].counter_id, opId: op1.rows[0].user_id, waitMin: 15, servMin: 9 },
      { code: 'ADM', sId: admId, cId: c1.rows[0].counter_id, opId: op1.rows[0].user_id, waitMin: 9, servMin: 8 },
      { code: 'ACC', sId: accId, cId: c2.rows[0].counter_id, opId: op2.rows[0].user_id, waitMin: 8, servMin: 5 },
      { code: 'ACC', sId: accId, cId: c2.rows[0].counter_id, opId: op2.rows[0].user_id, waitMin: 6, servMin: 6 },
      { code: 'EXM', sId: exmId, cId: c3.rows[0].counter_id, opId: op3.rows[0].user_id, waitMin: 20, servMin: 11 },
      { code: 'EXM', sId: exmId, cId: c3.rows[0].counter_id, opId: op3.rows[0].user_id, waitMin: 18, servMin: 10 }
    ];

    for (let i = 0; i < mockCompleted.length; i++) {
      const item = mockCompleted[i];
      const seq = i + 1;
      const tokenNum = `${item.code}-${String(seq).padStart(3, '0')}`;
      const createdTime = new Date(now.getTime() - (item.waitMin + item.servMin + 20) * 60000);
      const calledTime = new Date(createdTime.getTime() + item.waitMin * 60000);
      const completedTime = new Date(calledTime.getTime() + item.servMin * 60000);

      const tokRes = await client.query(`
        INSERT INTO queue_tokens (
          organization_id, service_id, counter_id, token_number, daily_sequence, queue_position,
          status, estimated_wait_minutes, called_at, service_started_at, completed_at,
          actual_wait_seconds, actual_service_seconds, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 0, 'completed', $6, $7, $7, $8, $9, $10, $11)
        RETURNING token_id;
      `, [
        orgId, item.sId, item.cId, tokenNum, seq,
        item.waitMin, calledTime, completedTime,
        item.waitMin * 60, item.servMin * 60, createdTime
      ]);

      await client.query(`
        INSERT INTO service_events (token_id, counter_id, operator_id, event_type, timestamp)
        VALUES ($1, $2, $3, 'completed', $4);
      `, [tokRes.rows[0].token_id, item.cId, item.opId, completedTime]);
    }

    // 7. Seed currently active/waiting tokens for Admissions and Accounts
    // Token in service at Counter 1
    const tServing = await client.query(`
      INSERT INTO queue_tokens (
        organization_id, service_id, counter_id, token_number, daily_sequence, queue_position,
        status, estimated_wait_minutes, called_at, service_started_at, created_at
      )
      VALUES ($1, $2, $3, 'ADM-004', 4, 0, 'in_service', 10, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '12 minutes')
      RETURNING token_id;
    `, [orgId, admId, c1.rows[0].counter_id]);

    await client.query(`
      INSERT INTO service_events (token_id, counter_id, operator_id, event_type, timestamp)
      VALUES ($1, $2, $3, 'started', NOW() - INTERVAL '3 minutes');
    `, [tServing.rows[0].token_id, c1.rows[0].counter_id, op1.rows[0].user_id]);

    // Token waiting for Admissions
    const tWaiting = await client.query(`
      INSERT INTO queue_tokens (
        organization_id, service_id, user_id, token_number, daily_sequence, queue_position,
        status, estimated_wait_minutes, created_at
      )
      VALUES ($1, $2, $3, 'ADM-005', 5, 1, 'waiting', 8, NOW() - INTERVAL '5 minutes')
      RETURNING token_id;
    `, [orgId, admId, visitorUser.rows[0].user_id]);

    await client.query(`
      INSERT INTO service_events (token_id, event_type, timestamp)
      VALUES ($1, 'joined', NOW() - INTERVAL '5 minutes');
    `, [tWaiting.rows[0].token_id]);

    await client.query(`
      INSERT INTO notifications (user_id, token_id, message, notification_type)
      VALUES ($1, $2, 'Your token ADM-005 has been generated. You are position #1 in queue.', 'token_generated');
    `, [visitorUser.rows[0].user_id, tWaiting.rows[0].token_id]);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    console.log('Credentials:');
    console.log('  Admin:    admin@ghostqueue.io / admin123');
    console.log('  Operator: operator1@ghostqueue.io / operator123');
    console.log('  Visitor:  visitor@ghostqueue.io / visitor123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
