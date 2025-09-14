/* eslint-disable no-undef */
/**
 * Mock Server Middleware
 * Handles custom authentication and response logic for WebSDK demo
 */

const fs = require('fs');
const path = require('path');

// Track retry attempts for events (in memory for demo)
const retryAttempts = new Map();

// Helper function to read database
const readDb = () => {
  const dbPath = path.join(__dirname, 'db.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
};

// Helper function to write database
const writeDb = data => {
  const dbPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = (req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Cap-Nonce, X-Cap-Challenge-ID, X-Cap-Signature, X-Cap-Device-ID'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  console.log(`\n🔥 Mock Server Request:`);
  console.log(`   Method: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Headers:`, {
    'X-Cap-Nonce': req.headers['x-cap-nonce'],
    'X-Cap-Challenge-ID': req.headers['x-cap-challenge-id'],
    'X-Cap-Signature': req.headers['x-cap-signature'],
    'X-Cap-Device-ID': req.headers['x-cap-device-id'],
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
  }

  // Handle nonce requests
  if (req.method === 'POST' && req.url === '/auth/nonce') {
    const response = {
      nonce: `nonce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      challenge_id: `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expires_at: Date.now() + 300000, // 5 minutes from now
    };

    console.log(`✅ Nonce Response:`, response);
    res.json(response);
    return;
  }

  // Handle events requests
  if (req.method === 'POST' && req.url === '/mapp/events') {
    // Validate headers
    const requiredHeaders = ['x-cap-nonce', 'x-cap-challenge-id', 'x-cap-signature', 'x-cap-device-id'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);

    if (missingHeaders.length > 0) {
      console.log(`❌ Missing headers:`, missingHeaders);
      res.status(401).json({
        status: {
          success: false,
          code: 401,
          message: `Missing authentication headers: ${missingHeaders.join(', ')}`,
        },
      });
      return;
    }

    // Simulate different response scenarios based on event count
    const events = (req.body && req.body.events) || [];
    const eventCount = events.length;

    // Check if this is a retry test scenario
    const isRetryTest = events.some(event => event.attributes && event.attributes.test_retry);

    let response;
    let successfulEvents = []; // Track which events to store

    if (isRetryTest) {
      // Handle retry test scenario with progressive success
      console.log(`🔄 RETRY TEST DETECTED - Processing ${eventCount} retry events`);

      successfulEvents = [];
      const eventResponses = [];

      events.forEach(event => {
        const eventId = event.event_id;
        const currentAttempts = retryAttempts.get(eventId) || 0;
        const newAttempts = currentAttempts + 1;
        retryAttempts.set(eventId, newAttempts);

        console.log(`   Event ${event.name}: Attempt #${newAttempts}`);

        if (newAttempts <= 2) {
          // Fail first 2 attempts (simulate network issues)
          eventResponses.push({
            event_id: eventId,
            status: {
              success: false,
              code: 500,
              message: `Simulated failure - attempt ${newAttempts}/3`,
            },
          });
        } else {
          // Succeed on 3rd attempt
          eventResponses.push({
            event_id: eventId,
            status: {
              success: true,
              code: 200,
              message: `Success after ${newAttempts} attempts`,
            },
          });
          successfulEvents.push(event);
        }
      });

      response = {
        status: {
          success: successfulEvents.length === eventCount,
          code: successfulEvents.length === eventCount ? 200 : 201,
          message:
            successfulEvents.length === eventCount
              ? 'All retry events eventually succeeded'
              : 'Partial success - some events still failing',
        },
        events: eventResponses,
      };
    } else {
      // Normal response logic for non-retry tests
      if (eventCount === 0) {
        // Empty events array
        response = {
          status: {
            success: true,
            code: 200,
            message: 'No events to process',
          },
          events: [],
        };
        // No events to store
      } else if (eventCount <= 5) {
        // Small batch - all success
        successfulEvents = [...events]; // Store all events

        response = {
          status: {
            success: true,
            code: 200,
            message: 'All events processed successfully',
          },
          events: events.map(event => ({
            event_id: event.event_id,
            status: {
              success: true,
              code: 200,
              message: 'Event processed successfully',
            },
          })),
        };
      } else if (eventCount <= 10) {
        // Medium batch - partial success
        successfulEvents = events.slice(0, 7); // Store only first 7 events

        response = {
          status: {
            success: false,
            code: 201,
            message: 'Partial success - some events failed',
          },
          events: events.map((event, index) => ({
            event_id: event.event_id,
            status:
              index < 7
                ? {
                    success: true,
                    code: 200,
                    message: 'Event processed successfully',
                  }
                : {
                    success: false,
                    code: 429,
                    message: 'Rate limit exceeded - retry later',
                  },
          })),
        };
      } else if (eventCount <= 50) {
        // Large batch (11-50 events) - all success for batch testing
        successfulEvents = [...events]; // Store all events

        response = {
          status: {
            success: true,
            code: 200,
            message: 'Large batch processed successfully',
          },
          events: events.map(event => ({
            event_id: event.event_id,
            status: {
              success: true,
              code: 200,
              message: 'Event processed successfully',
            },
          })),
        };
      } else {
        // Very large batch (>50 events) - simulate server error for edge case testing
        successfulEvents = []; // No events stored on server error

        response = {
          status: {
            success: false,
            code: 500,
            message: 'Batch size too large - please retry with smaller batches',
          },
        };
      }
    } // End of normal response logic

    // Store successful events in database
    if (successfulEvents.length > 0) {
      try {
        const db = readDb();

        // Initialize stored_events array if it doesn't exist
        if (!db.stored_events) {
          db.stored_events = [];
        }

        // Add timestamp and request metadata to successful events
        const eventsToStore = successfulEvents.map(event => ({
          ...event,
          stored_at: new Date().toISOString(),
          request_id: req.body.request_id,
          system_data: req.body.system_data,
          cuid: req.body.cuid,
        }));

        // Add events to stored_events array
        db.stored_events.push(...eventsToStore);

        // Write back to database
        writeDb(db);

        console.log(
          `💾 Stored ${successfulEvents.length} successful events in database (out of ${eventCount} total)`
        );
      } catch (error) {
        console.error('❌ Error storing events:', error);
      }
    } else if (eventCount > 0) {
      console.log(`⚠️ No events stored - all ${eventCount} events failed processing`);
    }

    // Add special handling for test events
    const hasTestEvents = events.some(
      event =>
        event.name &&
        (event.name.includes('success_test') ||
          event.name.includes('partial_test') ||
          event.name.includes('batch_queue') ||
          event.name.includes('large_batch') ||
          event.name.includes('retry_test') ||
          event.name.includes('rapid_fire'))
    );

    if (hasTestEvents) {
      console.log(`🧪 TEST EVENTS DETECTED (${eventCount} events):`);
      events.forEach((event, index) => {
        let testType = 'OTHER';
        if (event.attributes?.test_success) testType = 'ALL_SUCCESS_TEST';
        else if (event.attributes?.test_partial) testType = 'PARTIAL_SUCCESS_TEST';
        else if (event.attributes?.test_batch_queue) testType = 'BATCH_QUEUE_TEST';
        else if (event.attributes?.test_large_batch) testType = 'LARGE_BATCH_TEST';
        else if (event.attributes?.test_retry) testType = 'RETRY_TEST';
        else if (event.attributes?.test_rapid_fire) testType = 'RAPID_FIRE_TEST';

        console.log(`   ${index + 1}. ${event.name} - ${testType}`);
      });
    }

    console.log(`✅ Events Response (${eventCount} events):`, JSON.stringify(response, null, 2));

    // Add a small delay to simulate network latency
    setTimeout(() => {
      res.json(response);
    }, 5000);
    return;
  }

  // Continue to json-server for other routes
  next();
};
