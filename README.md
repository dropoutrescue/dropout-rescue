# Dropout Rescue ⚽

A mobile-first web app for organizing local football games. Built for communities to find players, create games, and manage participation.

## Features

- **Authentication** - Signup/Login with JWT tokens
- **Game Management** - Create, view, and manage football games
- **Player Requests** - Request spots, approve/decline players
- **Reserve System** - Auto-promotion when confirmed players withdraw
- **Notifications** - In-app alerts for organizers
- **Admin Panel** - Manage all games and users
- **Reliability Badges** - Visual indicators for player reliability (New/Getting Started/Regular)

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** FastAPI (Python), Uvicorn
- **Database:** MongoDB
- **Authentication:** JWT tokens

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URL

# Run backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local if needed

# Run frontend
npm run dev
# or
yarn dev
```

### 3. Access the App

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- API Docs: http://localhost:8001/docs

---

## Production Deployment

### Database: MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IPs (0.0.0.0/0 for all, or specific IPs)
5. Get your connection string: `mongodb+srv://<user>:<password>@cluster.xxxxx.mongodb.net/<dbname>`

### Backend: Render (Recommended)

1. Go to [Render](https://render.com) and create account
2. New → Web Service
3. Connect your GitHub repo (or upload manually)
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   - `MONGO_URL` = your MongoDB Atlas connection string
   - `DB_NAME` = `dropout_rescue` (or your preferred name)
   - `SECRET_KEY` = a random secure string (generate with `openssl rand -hex 32`)
   - `ADMIN_EMAIL` = `kyle@dropoutrescue.co.uk` (or your admin email)
6. Deploy!

**Your backend URL will be:** `https://your-app-name.onrender.com`

### Backend: Railway (Alternative)

1. Go to [Railway](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repo, set root directory to `backend`
4. Add Environment Variables (same as Render above)
5. Railway will auto-detect Python and deploy

**Your backend URL will be:** `https://your-app-name.up.railway.app`

### Frontend: Vercel (Recommended)

1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = your backend URL (e.g., `https://your-backend.onrender.com/api`)
5. Deploy!

**Your frontend URL will be:** `https://your-app.vercel.app`

---

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|-------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `DB_NAME` | Database name | `dropout_rescue` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-here` |
| `ADMIN_EMAIL` | Admin user email | `kyle@dropoutrescue.co.uk` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|-------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://your-backend.onrender.com/api` |

---

## CORS Configuration

The backend is configured with permissive CORS for development:

```python
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Change this in production!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**For production**, update `allow_origins` in `backend/server.py` to your frontend URL:

```python
allow_origins=["https://your-app.vercel.app"],
```

---

## API URL Configuration

### Development (Local)

The frontend uses Next.js rewrites to proxy API calls:

```javascript
// next.config.ts
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8001/api/:path*',
    },
  ];
}
```

And the auth context uses:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL; // '/api' for local
```

### Production

Set `NEXT_PUBLIC_API_URL` to your full backend URL:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

---

## Smoke Test Checklist

After deployment, verify these flows work:

### Authentication
- [ ] Sign up new user
- [ ] Log in with credentials
- [ ] Log out successfully
- [ ] Protected routes redirect to login

### Games
- [ ] Create a new game
- [ ] View game list (Find Games page)
- [ ] View game details
- [ ] Request spot as player
- [ ] Approve/decline requests (as organizer)
- [ ] Share game link works

### Player Management
- [ ] Confirm player adds them to game
- [ ] "Can't make it" removes player and notifies organizer
- [ ] Reserve players get auto-promoted

### Notifications
- [ ] Organizer receives notifications
- [ ] Notification count badge updates
- [ ] Mark as read works

### Admin (login as kyle@dropoutrescue.co.uk)
- [ ] Admin panel accessible
- [ ] Can view all games
- [ ] Can delete games
- [ ] Can view all users
- [ ] Can delete users (except self)

---

## Default Admin

The app has a hardcoded admin email:
- **Email:** `kyle@dropoutrescue.co.uk`
- **Password:** Set when signing up

To change the admin, update `ADMIN_EMAIL` in backend environment variables.

---

## Project Structure

```
dropout-rescue/
├── README.md
├── backend/
│   ├── server.py          # All API logic
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment template
└── frontend/
    ├── app/
    │   ├── layout.tsx     # Root layout
    │   ├── page.tsx       # Home redirect
    │   ├── globals.css    # Global styles
    │   ├── auth/
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   └── dashboard/
    │       ├── layout.tsx       # Dashboard nav
    │       ├── games/page.tsx   # Find games
    │       ├── games/[id]/page.tsx  # Game detail
    │       ├── create/page.tsx  # Create game
    │       ├── my-games/page.tsx
    │       ├── profile/page.tsx
    │       ├── notifications/page.tsx
    │       └── admin/page.tsx
    ├── lib/
    │   └── auth.tsx       # Auth context
    ├── public/
    │   └── logo.png       # App logo
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    └── .env.example
```

---

## License

MIT License - feel free to use and modify for your own football community!

---

## Support

Built with ❤️ for local football communities.
