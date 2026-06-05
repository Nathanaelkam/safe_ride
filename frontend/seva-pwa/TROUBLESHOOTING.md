# "Failed to fetch" Error Troubleshooting

## Quick Fix Steps

### 1. Check Backend Services
First, verify your backend services are running:

```bash
# Navigate to backend directory
cd ../backend

# Check if services are running
docker-compose ps

# If not running, start them
docker-compose up -d

# Wait 30 seconds for all services to start
```

### 2. Verify Service Health
Test each service manually:

**Windows Command Prompt:**
```cmd
curl http://localhost:8001/health
curl http://localhost:8002/health  
curl http://localhost:8003/health
```

**PowerShell:**
```powershell
Invoke-RestMethod http://localhost:8001/health
Invoke-RestMethod http://localhost:8002/health
Invoke-RestMethod http://localhost:8003/health
```

**Browser:** Visit these URLs directly:
- http://localhost:8001/health
- http://localhost:8002/health
- http://localhost:8003/health

Each should return: `{"status": "ok"}`

### 3. Check Docker Containers
```bash
# See running containers
docker ps

# Check logs if services aren't responding
docker-compose logs auth-service
docker-compose logs tracking-service
docker-compose logs emergency-service
```

### 4. CORS Issues (Most Common)
The backend might not allow frontend connections. Add CORS middleware:

**Temporary Fix - Add to each service's main.py:**
```python
from fastapi.middleware.cors import CORSMiddleware

# Add after app = FastAPI(...)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. Port Conflicts
Check if ports are already in use:

```cmd
# Windows
netstat -an | findstr "8001"
netstat -an | findstr "8002" 
netstat -an | findstr "8003"
```

### 6. Firewall/Antivirus
- Temporarily disable Windows Firewall
- Check if antivirus is blocking localhost connections
- Add Docker and Node.js to firewall exceptions

## Alternative Solutions

### Option 1: Use Different Ports
If ports 8001-8003 are blocked, modify docker-compose.yml:

```yaml
ports:
  - "9001:8000"  # Auth service
  - "9002:8000"  # Tracking service  
  - "9003:8000"  # Emergency service
```

Then update `.env.local`:
```env
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:9001
NEXT_PUBLIC_TRACKING_SERVICE_URL=http://localhost:9002
NEXT_PUBLIC_EMERGENCY_SERVICE_URL=http://localhost:9003
```

### Option 2: Use Next.js Proxy (Recommended)
Add to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:8001/:path*',
      },
      {
        source: '/api/tracking/:path*', 
        destination: 'http://localhost:8002/:path*',
      },
      {
        source: '/api/emergency/:path*',
        destination: 'http://localhost:8003/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

Then update `.env.local`:
```env
NEXT_PUBLIC_AUTH_SERVICE_URL=/api/auth
NEXT_PUBLIC_TRACKING_SERVICE_URL=/api/tracking
NEXT_PUBLIC_EMERGENCY_SERVICE_URL=/api/emergency
```

### Option 3: Mock Mode (Testing Only)
Temporarily enable mock mode by updating `src/services/api.ts`:

```typescript
// At the top of api.ts, add:
const MOCK_MODE = true; // Set to false when backend is ready

// In each method, add fallback:
async login(phoneNumber: string, password: string) {
  if (MOCK_MODE) {
    return {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      user: { id: '1', fullName: 'Test User', phone: phoneNumber }
    };
  }
  // ... rest of real implementation
}
```

## Step-by-Step Debug Process

### Step 1: Verify Frontend Environment
```bash
# In frontend directory
npm run dev

# Check browser console for the exact error
# Open Network tab in DevTools to see failed requests
```

### Step 2: Test Backend Directly
```bash
# Test registration endpoint directly
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","phone_number":"+237123456789","password":"password123"}'
```

### Step 3: Check Network Path
- Open browser DevTools → Network tab
- Try to register/login
- Look for failed requests (red entries)
- Check the exact error message

### Step 4: Common Error Messages

**"Failed to fetch"** → Backend not running or wrong URL
**"CORS error"** → Backend needs CORS middleware  
**"Connection refused"** → Port not accessible
**"Network error"** → Firewall/antivirus blocking

## Quick Test Commands

```bash
# Start backend
cd backend && docker-compose up -d

# Start frontend (new terminal)
cd frontend/seva-pwa && npm run dev

# Test in browser
# Go to http://localhost:3000/register
# Open DevTools → Console
# Try to register
```

If none of these work, the issue is likely:
1. **Docker not running** - Start Docker Desktop
2. **Backend services failed to start** - Check docker-compose logs
3. **Port conflicts** - Use different ports
4. **Network security software** - Temporarily disable

The proxy solution (Option 2) is usually the most reliable fix!