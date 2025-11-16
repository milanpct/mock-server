/* eslint-disable no-undef */
/**
 * Mock Server Configuration
 * Custom json-server setup for WebSDK demo
 */

const jsonServer = require("json-server");
const middleware = require("./middleware.cjs");
const path = require("path");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const defaults = jsonServer.defaults();

// Add body parser middleware first
server.use(jsonServer.bodyParser);

// Set default middlewares (logger, static, cors and no-cache)
server.use(defaults);

// Add custom middleware BEFORE json-server router
server.use(middleware);

// Use default router
server.use(router);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`\n🚀 WebSDK Mock Server is running!`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔗 Endpoints:`);
  console.log(`   POST /auth/nonce           - Request authentication nonce`);
  console.log(`   POST /mapp/events          - Send events to server`);
  console.log(
    `   GET  /v2/visitors/config   - Get visitor tracking configuration`
  );
  console.log(`\n💡 Test scenarios:`);
  console.log(`   • 1-5 events:   All success (200)`);
  console.log(`   • 6-10 events:  Partial success (201)`);
  console.log(`   • 11+ events:   Server error (500)`);
  console.log(`\n🛑 Stop server: Ctrl+C\n`);
});
