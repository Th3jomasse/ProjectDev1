# API Gateway

> Single entry point for all microservices in the Restaurant POS System

## Overview

The API Gateway serves as the unified entry point for all client requests. It handles request routing, rate limiting, authentication validation, logging, and error handling before forwarding requests to the appropriate microservices.

## Features

- ✅ **Request Routing**: Routes requests to appropriate microservices
- ✅ **Rate Limiting**: 100 requests per minute per IP (configurable)
- ✅ **Security Middleware**: Helmet.js for security headers
- ✅ **Compression**: GZIP compression for responses
- ✅ **CORS**: Configurable cross-origin resource sharing
- ✅ **Global Error Handling**: Consistent error responses
- ✅ **Request/Response Logging**: Detailed HTTP logging
- ✅ **Response Transformation**: Standardized response format
- ✅ **Health Checks**: Liveness, readiness, and service health probes
- ✅ **API Documentation**: Auto-generated Swagger/OpenAPI docs
- ✅ **Validation**: Global input validation with class-validator
- ✅ **API Versioning**: Supports `/api/v1` prefix

## Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────┐
│         API Gateway (Port 3000)      │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Rate Limiting & Security      │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  Authentication Validation     │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │  Logging & Transformation      │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │       Request Router           │ │
│  └────────────────────────────────┘ │
└──────────────┬───────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ↓                 ↓
┌──────────┐      ┌──────────┐
│   Auth   │      │ Product  │
│ Service  │      │ Service  │
│ :3001    │      │ :3004    │
└──────────┘      └──────────┘
```

## Endpoints

### Gateway Info

```
GET /api/v1
```
Returns API Gateway information

### Health Checks

```
GET /api/v1/health
```
Complete health check with all microservices status

```
GET /api/v1/health/liveness
```
Kubernetes liveness probe

```
GET /api/v1/health/readiness
```
Kubernetes readiness probe

### Authentication (Proxied to Auth Service)

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

## Installation

```bash
cd apps/api-gateway
pnpm install
```

## Configuration

The API Gateway uses environment variables from the root `.env` file:

```env
# API Gateway
API_GATEWAY_PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Microservices Ports
AUTH_SERVICE_PORT=3001
ORDER_SERVICE_PORT=3002
PAYMENT_SERVICE_PORT=3003
PRODUCT_SERVICE_PORT=3004

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## Running the Gateway

### Development Mode

```bash
# From api-gateway directory
pnpm start:dev

# Or from root
pnpm nx serve api-gateway
```

### Production Mode

```bash
# Build
pnpm build

# Run
pnpm start:prod
```

## API Documentation

Once the gateway is running, access the Swagger UI at:

```
http://localhost:3000/api/docs
```

The documentation includes:
- All available endpoints
- Request/response schemas
- Authentication requirements
- Try-it-out functionality

## Rate Limiting

The gateway implements rate limiting to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Response Header**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Configuration**: Update `ThrottlerModule` in `app.module.ts`

```typescript
ThrottlerModule.forRoot([
  {
    ttl: 60000,  // Time window (ms)
    limit: 100,  // Max requests
  },
]),
```

## Request/Response Format

### Standard Response

All successful responses are wrapped in a standard format:

```json
{
  "data": {
    // Actual response data
  },
  "timestamp": "2025-11-05T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### Error Response

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "timestamp": "2025-11-05T10:30:00.000Z",
  "path": "/api/v1/auth/register",
  "method": "POST",
  "message": "Email already exists",
  "error": "Bad Request"
}
```

## Security Features

### Helmet.js

Security headers are automatically applied:
- X-DNS-Prefetch-Control
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- And more...

### CORS

Cross-Origin Resource Sharing is configured via environment variables:

```typescript
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Input Validation

All incoming requests are validated using `class-validator`:
- Automatic DTO validation
- Whitelist mode (strips unknown properties)
- Transform mode (type conversion)

## Logging

The gateway logs all HTTP requests with:
- Request method, URL, IP, User-Agent
- Response status code
- Response time in milliseconds

Example output:
```
[HTTP] → POST /api/v1/auth/login - 127.0.0.1 - PostmanRuntime/7.26.8
[HTTP] ← POST /api/v1/auth/login - 200 - 145ms
```

## Health Monitoring

### Service Health Check

The gateway monitors all connected microservices:

```bash
curl http://localhost:3000/api/v1/health
```

Response:
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-05T10:30:00.000Z",
    "uptime": 3600,
    "services": {
      "auth-service": {
        "status": "healthy",
        "url": "http://localhost:3001/auth/health"
      }
    }
  },
  "timestamp": "2025-11-05T10:30:00.000Z",
  "path": "/api/v1/health"
}
```

## Testing

### Manual Testing with cURL

#### Check Gateway Info
```bash
curl http://localhost:3000/api/v1
```

#### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

#### Register User (via Gateway)
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@restaurant.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "SERVER"
  }'
```

#### Login (via Gateway)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@restaurant.com",
    "password": "SecurePass123!"
  }'
```

#### Get Profile (via Gateway)
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Adding New Microservice Routes

To proxy requests to a new microservice:

1. **Create a proxy module**:
   ```bash
   mkdir -p src/product-proxy
   ```

2. **Implement controller**:
   ```typescript
   @Controller('products')
   export class ProductProxyController {
     constructor(private readonly productProxyService: ProductProxyService) {}

     @Get()
     async getAll() {
       return this.productProxyService.getAll();
     }
   }
   ```

3. **Implement service**:
   ```typescript
   @Injectable()
   export class ProductProxyService {
     private readonly productServiceUrl: string;

     constructor(
       private readonly configService: ConfigService,
       private readonly httpService: HttpService,
     ) {
       const port = this.configService.get<number>('PRODUCT_SERVICE_PORT', 3004);
       this.productServiceUrl = `http://localhost:${port}/products`;
     }

     async getAll() {
       const response = await firstValueFrom(
         this.httpService.get(this.productServiceUrl),
       );
       return response.data;
     }
   }
   ```

4. **Register module in AppModule**:
   ```typescript
   imports: [
     // ... other modules
     ProductProxyModule,
   ]
   ```

## Troubleshooting

### Gateway won't start

**Issue**: Port 3000 already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**: Change port in `.env` or kill process using port 3000
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Microservice unreachable

**Issue**: Gateway can't connect to microservice
```
Authentication service is temporarily unavailable
```

**Solution**: Ensure the microservice is running
```bash
# Check Auth Service
curl http://localhost:3001/auth/health
```

### Rate limit exceeded

**Issue**: Too many requests from same IP
```
ThrottlerException: Too Many Requests
```

**Solution**: Wait for rate limit window to reset (1 minute) or increase limit in code

## Development Tips

1. **Hot Reload**: Use `pnpm start:dev` for automatic restart on file changes
2. **Debug Mode**: Use `pnpm start:debug` and attach debugger on port 9229
3. **Check Logs**: All requests are logged with timing information
4. **Use Swagger**: Test endpoints interactively at `/api/docs`
5. **Health First**: Always check `/health` endpoint when debugging connectivity

## Project Structure

```
apps/api-gateway/
├── src/
│   ├── auth-proxy/              # Auth service proxy
│   │   ├── dto/                 # Data transfer objects
│   │   ├── auth-proxy.controller.ts
│   │   ├── auth-proxy.service.ts
│   │   └── auth-proxy.module.ts
│   ├── health/                  # Health check endpoints
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   └── health.module.ts
│   ├── filters/                 # Exception filters
│   │   └── http-exception.filter.ts
│   ├── interceptors/            # Request/response interceptors
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── app.controller.ts        # Root controller
│   ├── app.service.ts           # Root service
│   ├── app.module.ts            # Root module
│   └── main.ts                  # Application entry point
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## Future Enhancements

- [ ] JWT validation at gateway level (avoid forwarding invalid tokens)
- [ ] Request caching with Redis
- [ ] Circuit breaker pattern for microservice failures
- [ ] GraphQL federation gateway
- [ ] WebSocket support
- [ ] Distributed tracing with OpenTelemetry
- [ ] API key authentication for external clients
- [ ] Advanced rate limiting (per user, per endpoint)

---

**Port**: 3000
**Documentation**: http://localhost:3000/api/docs
**Status**: ✅ Fully Functional
