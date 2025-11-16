# Hydra WebSDK Mock Server

Mock server for testing and development of the Hydra WebSDK.

## Features

- **Authentication Endpoints**: `/auth/nonce` for secure authentication
- **Event Processing**: `/mapp/events` for event tracking
- **Visitor Configuration**: `/v2/visitors/config` for visitor tracking settings
- **Test Scenarios**: Different response behaviors based on event count
- **Retry Logic**: Simulated retry scenarios for testing
- **CORS Support**: Ready for cross-origin requests

## Local Development

```bash
npm install
npm start
```

Server runs on `http://localhost:3001`

## Deployment on Render

### Quick Deploy Steps

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically use the `render.yaml` configuration
6. Deploy!

## API Endpoints

### POST /auth/nonce

Request authentication nonce for secure API calls.

**Response:**

```json
{
  "nonce": "nonce-timestamp-random",
  "challenge_id": "challenge-timestamp-random",
  "expires_at": 1735689600000
}
```

### POST /mapp/events

Send events for processing.

**Headers Required:**

- `X-Cap-Nonce`: Authentication nonce
- `X-Cap-Challenge-ID`: Challenge identifier
- `X-Cap-Signature`: Request signature

**Test Scenarios:**

- 1-5 events: All success (200)
- 6-10 events: Partial success (201)
- 11-50 events: All success (200)
- 50+ events: Server error (500)

### GET /v2/visitors/config

Get visitor tracking configuration.

**Headers Required:**

- `X-CAP-API-AUTH-ORG-ID`: Organization identifier
- `X-CAP-VAP-ID`: VAP (Visitor Analytics Platform) identifier

**Response:**

```json
{
  "isVisitorTrackingEnabled": true,
  "warnings": []
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (production/development)
