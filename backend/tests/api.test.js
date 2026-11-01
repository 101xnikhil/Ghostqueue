const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/config/db');

describe('GhostQueue Comprehensive Backend Test Suite', () => {
  let adminToken = '';
  let operatorToken = '';
  let visitorToken = '';
  let guestToken = '';
  let testServiceId = '';
  let testCounterId = '';
  let createdTokenId = '';
  let createdTokenNumber = '';

  before(async () => {
    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ghostqueue.io', password: 'admin123' });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.token;

    // Authenticate Operator 1
    const opRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operator1@ghostqueue.io', password: 'operator123' });
    assert.equal(opRes.status, 200);
    operatorToken = opRes.body.token;

    // Fetch existing service and counter for testing
    const svcRes = await request(app).get('/api/services');
    assert.equal(svcRes.status, 200);
    const services = svcRes.body.services;
    assert.ok(services.length > 0);
    const testSvc = services.find(s => s.service_code === 'ADM') || services[0];
    testServiceId = testSvc.service_id;

    const cntRes = await request(app).get('/api/counters');
    assert.equal(cntRes.status, 200);
    const counters = cntRes.body.counters;
    assert.ok(counters.length > 0);
    testCounterId = counters[0].counter_id;
  });

  after(async () => {
    await db.pool.end();
  });

  it('1. Health Check should return healthy and connected database', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.equal(res.body.database, 'connected');
  });

  it('2. User Registration should create a new visitor account', async () => {
    const uniqueEmail = `test_visitor_${Date.now()}@ghostqueue.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Visitor User',
        email: uniqueEmail,
        password: 'password123',
        phone: '9876543210'
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'visitor');
    visitorToken = res.body.token;
  });

  it('3. Guest login should create guest visitor session instantly', async () => {
    const res = await request(app)
      .post('/api/auth/guest')
      .send({
        name: 'Guest Explorer',
        phone: '9998887776'
      });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.is_guest, true);
    guestToken = res.body.token;
  });

  it('4. Role-Based Authorization: Visitor cannot access Admin Settings', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${visitorToken}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('5. Role-Based Authorization: Admin CAN access Admin Settings', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.settings);
  });

  it('6. Queue Token Generation: Visitor joins service queue and receives unique token & estimate', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${visitorToken}`)
      .send({ serviceId: testServiceId });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.ok(res.body.token.token_number);
    assert.ok(res.body.token.estimated_wait_minutes >= 0);
    assert.equal(res.body.token.status, 'waiting');
    createdTokenId = res.body.token.token_id;
    createdTokenNumber = res.body.token.token_number;
  });

  it('7. Duplicate Active Token Prevention: User cannot join the same service queue twice while waiting', async () => {
    const res = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${visitorToken}`)
      .send({ serviceId: testServiceId });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('8. Live Queue Tracking: Get token details returns current position and timeline', async () => {
    const res = await request(app).get(`/api/queue/${createdTokenId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.token.token_id, createdTokenId);
    assert.ok(res.body.token.timeline.length >= 1);
  });

  it('9. Counter Management: Pause and Resume counter', async () => {
    // Pause
    const pauseRes = await request(app)
      .put('/api/operator/counter-status')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ counterId: testCounterId, status: 'paused' });
    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.body.counter.status, 'paused');

    // Resume
    const resumeRes = await request(app)
      .put('/api/operator/counter-status')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ counterId: testCounterId, status: 'active' });
    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.body.counter.status, 'active');
  });

  it('10. Operator Service Flow: Call next token, start service, and complete service', async () => {
    // Ensure counter is clear by completing any active token at this counter if present
    const stateRes = await request(app)
      .get(`/api/operator/counter/${testCounterId}/state`)
      .set('Authorization', `Bearer ${operatorToken}`);
    
    if (stateRes.body.currentToken) {
      await request(app)
        .post('/api/operator/complete-service')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ tokenId: stateRes.body.currentToken.token_id, counterId: testCounterId });
    }

    // Call Next Token
    const callRes = await request(app)
      .post('/api/operator/call-next')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ counterId: testCounterId });
    assert.equal(callRes.status, 200);
    assert.ok(callRes.body.token);
    assert.equal(callRes.body.token.status, 'called');
    const calledTokenId = callRes.body.token.token_id;

    // Start Service
    const startRes = await request(app)
      .post('/api/operator/start-service')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ tokenId: calledTokenId, counterId: testCounterId });
    assert.equal(startRes.status, 200);
    assert.equal(startRes.body.token.status, 'in_service');

    // Complete Service
    const completeRes = await request(app)
      .post('/api/operator/complete-service')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ tokenId: calledTokenId, counterId: testCounterId, notes: 'Routine check complete' });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.token.status, 'completed');
    assert.ok(completeRes.body.token.actual_service_seconds >= 0);
  });

  it('11. Queue Cancellation: Visitor can cancel their waiting token', async () => {
    // Guest joins queue
    const joinRes = await request(app)
      .post('/api/queue/join')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ serviceId: testServiceId });
    assert.equal(joinRes.status, 201);
    const gTokenId = joinRes.body.token.token_id;

    // Guest cancels token
    const cancelRes = await request(app)
      .post(`/api/queue/${gTokenId}/cancel`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ reason: 'Changed mind' });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.success, true);

    // Verify token is cancelled
    const checkRes = await request(app).get(`/api/queue/${gTokenId}`);
    assert.equal(checkRes.body.token.status, 'cancelled');
  });

  it('12. Prediction Accuracy and Analytics: Reports real database metrics', async () => {
    const accuracyRes = await request(app)
      .get('/api/analytics/prediction-accuracy')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(accuracyRes.status, 200);
    assert.ok(accuracyRes.body.sampleSize >= 3);
    assert.ok(accuracyRes.body.hasSufficientData === true);
    assert.ok(typeof accuracyRes.body.maeMinutes === 'number');

    const throughputRes = await request(app)
      .get('/api/analytics/throughput')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(throughputRes.status, 200);
    assert.ok(Array.isArray(throughputRes.body.distribution));
  });
});
