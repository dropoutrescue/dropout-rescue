from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from bson import ObjectId
import jwt
from jwt.exceptions import InvalidTokenError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('SECRET_KEY', 'dropout-rescue-secret-key-change-in-production')
ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'kyle@dropoutrescue.co.uk')

# Create the main app
app = FastAPI()
@app.get("/")
def root():
    return {"status": "ok", "service": "dropout-rescue-backend"}

@app.get("/health")
def health():
    return {"ok": True}
api_router = APIRouter(prefix="/api")

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    area: Optional[str] = None  # e.g. "Arnold", "City Centre"
    bio: Optional[str] = None  # Max 120 chars
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

def compute_trust_score(games_shown: int, games_no_show: int) -> Optional[float]:
    total = games_shown + games_no_show
    return games_shown / total if total > 0 else None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    area: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    games_played: int = 0
    games_shown: int = 0
    games_no_show: int = 0
    trust_score: Optional[float] = None

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class GameCreate(BaseModel):
    venue: str
    date_time: str  # ISO datetime string
    players_needed: int
    format: str  # "5s", "6s", "7s", "8s", "9s", "10s", "11s"
    subs: Optional[float] = None
    notes: Optional[str] = None

class GameResponse(BaseModel):
    id: str
    organiser_id: str
    organiser_name: str
    organiser_phone: Optional[str] = None
    venue: str
    date_time: str
    players_needed: int
    format: str
    subs: Optional[float] = None
    notes: Optional[str] = None
    status: str  # "OPEN" or "FULL"
    confirmed_count: int = 0
    reserve_count: int = 0
    attendance_recorded: bool = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None

class ParticipantRequest(BaseModel):
    game_id: str
    action: str  # "REQUESTED" or "RESERVE"

class ParticipantResponse(BaseModel):
    id: str
    game_id: str
    user_id: Optional[str] = None
    user_name: str
    user_area: Optional[str] = None
    user_phone: Optional[str] = None
    user_games_played: int = 0
    status: str  # "REQUESTED", "CONFIRMED", "RESERVE"
    trust_score: Optional[float] = None

class PublicGameResponse(BaseModel):
    id: str
    venue: str
    date_time: str
    format: str
    players_needed: int
    status: str
    confirmed_count: int
    organiser_name: str

class QuickJoinRequest(BaseModel):
    name: str
    phone: str

class RepeatGameRequest(BaseModel):
    date_time: Optional[str] = None

class AttendanceEntry(BaseModel):
    participant_id: str
    result: str  # "shown" or "no_show"

class AttendanceRequest(BaseModel):
    attendance: List[AttendanceEntry]

# Auth endpoints
@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate bio length
    if user_data.bio and len(user_data.bio) > 120:
        raise HTTPException(status_code=400, detail="Bio must be 120 characters or less")
    
    user_dict = user_data.dict()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = datetime.utcnow()
    user_dict["games_played"] = 0
    user_dict["games_confirmed"] = 0
    user_dict["no_shows"] = 0
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    token = create_access_token({"user_id": str(result.inserted_id), "email": user_data.email})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user_dict["_id"]),
            name=user_dict["name"],
            email=user_dict["email"],
            area=user_dict.get("area"),
            bio=user_dict.get("bio"),
            phone=user_dict.get("phone"),
            is_admin=(user_dict["email"] == ADMIN_EMAIL),
            games_played=0,
            games_shown=0,
            games_no_show=0,
            trust_score=None
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    
    gs = user.get("games_shown", 0)
    gn = user.get("games_no_show", 0)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            area=user.get("area") or user.get("postcode"),  # Fallback for old users
            bio=user.get("bio"),
            phone=user.get("phone"),
            is_admin=bool(user.get("is_admin", False)),
            games_played=user.get("games_played", 0),
            games_shown=gs,
            games_no_show=gn,
            trust_score=compute_trust_score(gs, gn)
        )
    )

@api_router.put("/users/me", response_model=UserResponse)
async def update_profile(user_data: UserUpdate, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_data.bio and len(user_data.bio) > 120:
        raise HTTPException(status_code=400, detail="Bio must be 120 characters or less")

    update_fields = {k: v for k, v in user_data.dict().items() if v is not None}

    if update_fields:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})

    gs = updated_user.get("games_shown", 0)
    gn = updated_user.get("games_no_show", 0)
    return UserResponse(
        id=str(updated_user["_id"]),
        name=updated_user["name"],
        email=updated_user["email"],
        area=updated_user.get("area"),
        bio=updated_user.get("bio"),
        phone=updated_user.get("phone"),
        is_admin=(updated_user["email"] == ADMIN_EMAIL),
        games_played=updated_user.get("games_played", 0),
        games_shown=gs,
        games_no_show=gn,
        trust_score=compute_trust_score(gs, gn)
    )

@api_router.get("/public/games/{game_id}", response_model=PublicGameResponse)
async def get_public_game(game_id: str):
    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    confirmed_count = await db.participants.count_documents({
        "game_id": game_id,
        "status": "CONFIRMED"
    })
    return PublicGameResponse(
        id=str(game["_id"]),
        venue=game["venue"],
        date_time=game["date_time"],
        format=game["format"],
        players_needed=game["players_needed"],
        status=game["status"],
        confirmed_count=confirmed_count,
        organiser_name=game["organiser_name"]
    )

@api_router.post("/public/games/{game_id}/quick-join")
async def quick_join_game(game_id: str, request: QuickJoinRequest):
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not request.phone.strip():
        raise HTTPException(status_code=400, detail="Phone is required")
    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game["status"] != "OPEN":
        raise HTTPException(status_code=400, detail="This game is no longer open")
    existing = await db.participants.find_one({
        "game_id": game_id,
        "user_phone": request.phone.strip()
    })
    if existing:
        raise HTTPException(status_code=400, detail="This phone number has already requested to join")
    await db.participants.insert_one({
        "game_id": game_id,
        "user_id": None,
        "user_name": request.name.strip(),
        "user_phone": request.phone.strip(),
        "user_area": None,
        "user_games_played": 0,
        "status": "REQUESTED",
        "created_at": datetime.utcnow()
    })
    await db.notifications.insert_one({
        "user_id": game["organiser_id"],
        "type": "JOIN_REQUEST",
        "message": f"{request.name.strip()} wants to join {game['venue']}",
        "game_id": game_id,
        "player_name": request.name.strip(),
        "created_at": datetime.utcnow(),
        "read": False
    })
    return {"message": "Request sent"}

# Game endpoints
@api_router.post("/games", response_model=GameResponse)
async def create_game(game_data: GameCreate, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    game_dict = game_data.dict()
    game_dict["organiser_id"] = user_id
    game_dict["organiser_name"] = user["name"]
    game_dict["status"] = "OPEN"
    game_dict["created_at"] = datetime.utcnow()
    
    result = await db.games.insert_one(game_dict)
    game_dict["_id"] = result.inserted_id
    
    return GameResponse(
        id=str(game_dict["_id"]),
        organiser_id=game_dict["organiser_id"],
        organiser_name=game_dict["organiser_name"],
        venue=game_dict["venue"],
        date_time=game_dict["date_time"],
        players_needed=game_dict["players_needed"],
        format=game_dict["format"],
        subs=game_dict.get("subs"),
        notes=game_dict.get("notes"),
        status=game_dict["status"],
        confirmed_count=0,
        reserve_count=0,
        attendance_recorded=False
    )

@api_router.get("/games", response_model=List[GameResponse])
async def get_games():
    games_cursor = db.games.find().sort("date_time", 1)
    games = await games_cursor.to_list(length=None)
    
    game_responses = []
    for game in games:
        confirmed_count = await db.participants.count_documents({
            "game_id": str(game["_id"]),
            "status": "CONFIRMED"
        })
        reserve_count = await db.participants.count_documents({
            "game_id": str(game["_id"]),
            "status": "RESERVE"
        })
        
        game_responses.append(GameResponse(
            id=str(game["_id"]),
            organiser_id=game["organiser_id"],
            organiser_name=game["organiser_name"],
            venue=game["venue"],
            date_time=game["date_time"],
            players_needed=game["players_needed"],
            format=game["format"],
            subs=game.get("subs"),
            notes=game.get("notes"),
            status=game["status"],
            confirmed_count=confirmed_count,
            reserve_count=reserve_count,
            attendance_recorded=game.get("attendance_recorded", False)
        ))

    return game_responses

@api_router.get("/games/{game_id}", response_model=GameResponse)
async def get_game(game_id: str):
    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get organiser phone
    organiser = await db.users.find_one({"_id": ObjectId(game["organiser_id"])})
    organiser_phone = organiser.get("phone") if organiser else None
    
    confirmed_count = await db.participants.count_documents({
        "game_id": game_id,
        "status": "CONFIRMED"
    })
    reserve_count = await db.participants.count_documents({
        "game_id": game_id,
        "status": "RESERVE"
    })
    
    return GameResponse(
        id=str(game["_id"]),
        organiser_id=game["organiser_id"],
        organiser_name=game["organiser_name"],
        organiser_phone=organiser_phone,
        venue=game["venue"],
        date_time=game["date_time"],
        players_needed=game["players_needed"],
        format=game["format"],
        subs=game.get("subs"),
        notes=game.get("notes"),
        status=game["status"],
        confirmed_count=confirmed_count,
        reserve_count=reserve_count,
        attendance_recorded=game.get("attendance_recorded", False)
    )

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if user["email"] != ADMIN_EMAIL and game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorised to delete this game")

    try:
        await db.games.delete_one({"_id": ObjectId(game_id)})
        await db.participants.delete_many({"game_id": game_id})
        return {"message": "Game deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting game {game_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete game: {str(e)}")

@api_router.post("/games/{game_id}/repeat", response_model=GameResponse)
async def repeat_game(game_id: str, token: str, body: RepeatGameRequest):
    payload = verify_token(token)
    user_id = payload["user_id"]

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        original = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")

    if not original:
        raise HTTPException(status_code=404, detail="Game not found")

    if original["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the organiser can repeat this game")

    if body.date_time:
        new_date_time = body.date_time
    else:
        new_date_time = (datetime.fromisoformat(original["date_time"]) + timedelta(days=7)).isoformat()

    new_game = {
        "organiser_id": user_id,
        "organiser_name": user["name"],
        "venue": original["venue"],
        "date_time": new_date_time,
        "players_needed": original["players_needed"],
        "format": original["format"],
        "subs": original.get("subs"),
        "notes": original.get("notes"),
        "status": "OPEN",
        "created_at": datetime.utcnow()
    }

    result = await db.games.insert_one(new_game)

    return GameResponse(
        id=str(result.inserted_id),
        organiser_id=new_game["organiser_id"],
        organiser_name=new_game["organiser_name"],
        venue=new_game["venue"],
        date_time=new_game["date_time"],
        players_needed=new_game["players_needed"],
        format=new_game["format"],
        subs=new_game.get("subs"),
        notes=new_game.get("notes"),
        status=new_game["status"],
        confirmed_count=0,
        reserve_count=0,
        attendance_recorded=False
    )

# Get games user has joined (as participant)
@api_router.get("/my-games/joined")
async def get_joined_games(token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    # Get all participations for this user
    participations_cursor = db.participants.find({"user_id": user_id})
    participations = await participations_cursor.to_list(length=None)
    
    joined_games = []
    for p in participations:
        try:
            game = await db.games.find_one({"_id": ObjectId(p["game_id"])})
            if game:
                joined_games.append({
                    "id": str(game["_id"]),
                    "venue": game["venue"],
                    "date_time": game["date_time"],
                    "format": game["format"],
                    "players_needed": game["players_needed"],
                    "organiser_name": game["organiser_name"],
                    "status": p["status"]  # REQUESTED, CONFIRMED, or RESERVE
                })
        except:
            continue
    
    return joined_games

# Participant endpoints
@api_router.post("/participants", response_model=ParticipantResponse)
async def request_spot(request: ParticipantRequest, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    existing = await db.participants.find_one({
        "game_id": request.game_id,
        "user_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already requested this game")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    game = await db.games.find_one({"_id": ObjectId(request.game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    participant_dict = {
        "game_id": request.game_id,
        "user_id": user_id,
        "user_name": user["name"],
        "user_area": user.get("area") or user.get("postcode"),
        "user_phone": user.get("phone"),
        "user_games_played": user.get("games_played", 0),
        "status": request.action,
        "created_at": datetime.utcnow()
    }
    
    result = await db.participants.insert_one(participant_dict)
    participant_dict["_id"] = result.inserted_id
    
    # Create notification for organiser
    notification_type = "NEW_REQUEST" if request.action == "REQUESTED" else "NEW_RESERVE"
    notification_msg = f"{user['name']} wants to join {game['venue']}" if request.action == "REQUESTED" else f"{user['name']} joined reserve for {game['venue']}"
    
    await db.notifications.insert_one({
        "user_id": game["organiser_id"],
        "type": notification_type,
        "message": notification_msg,
        "game_id": request.game_id,
        "player_name": user["name"],
        "created_at": datetime.utcnow(),
        "read": False
    })
    
    return ParticipantResponse(
        id=str(participant_dict["_id"]),
        game_id=participant_dict["game_id"],
        user_id=participant_dict["user_id"],
        user_name=participant_dict["user_name"],
        user_area=participant_dict.get("user_area"),
        user_phone=participant_dict.get("user_phone"),
        user_games_played=participant_dict.get("user_games_played", 0),
        status=participant_dict["status"]
    )

@api_router.get("/games/{game_id}/participants", response_model=List[ParticipantResponse])
async def get_game_participants(game_id: str):
    participants_cursor = db.participants.find({"game_id": game_id})
    participants = await participants_cursor.to_list(length=None)
    
    result = []
    for p in participants:
        user = await db.users.find_one({"_id": ObjectId(p["user_id"])}) if p.get("user_id") else None
        games_played = user.get("games_played", 0) if user else p.get("user_games_played", 0)
        user_phone = user.get("phone") if user else p.get("user_phone")

        ts = None
        if user:
            gs = user.get("games_shown", 0)
            gn = user.get("games_no_show", 0)
            ts = compute_trust_score(gs, gn)

        result.append(ParticipantResponse(
            id=str(p["_id"]),
            game_id=p["game_id"],
            user_id=p["user_id"],
            user_name=p["user_name"],
            user_area=p.get("user_area") or p.get("user_position"),  # Fallback for old data
            user_phone=user_phone,
            user_games_played=games_played,
            status=p["status"],
            trust_score=ts
        ))
    
    return result

@api_router.post("/participants/{participant_id}/approve")
async def approve_participant(participant_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    try:
        participant = await db.participants.find_one({"_id": ObjectId(participant_id)})
    except:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    try:
        game = await db.games.find_one({"_id": ObjectId(participant["game_id"])})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only organiser can approve")
    
    # Check if space available
    if game["players_needed"] > 0:
        new_status = "CONFIRMED"
        # Decrease players needed
        new_players_needed = game["players_needed"] - 1
        await db.games.update_one(
            {"_id": ObjectId(participant["game_id"])},
            {
                "$set": {
                    "players_needed": new_players_needed,
                    "status": "FULL" if new_players_needed == 0 else "OPEN"
                }
            }
        )
    else:
        new_status = "RESERVE"
    
    await db.participants.update_one(
        {"_id": ObjectId(participant_id)},
        {"$set": {"status": new_status}}
    )
    
    return {"message": "Participant approved", "new_status": new_status}

@api_router.post("/participants/{participant_id}/decline")
async def decline_participant(participant_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    try:
        participant = await db.participants.find_one({"_id": ObjectId(participant_id)})
    except:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    try:
        game = await db.games.find_one({"_id": ObjectId(participant["game_id"])})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only organiser can decline")
    
    await db.participants.delete_one({"_id": ObjectId(participant_id)})
    
    return {"message": "Request declined"}

@api_router.delete("/participants/{participant_id}")
async def remove_participant(participant_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    try:
        participant = await db.participants.find_one({"_id": ObjectId(participant_id)})
    except:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    try:
        game = await db.games.find_one({"_id": ObjectId(participant["game_id"])})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only organiser can remove")
    
    # If removing confirmed player, increase players needed
    if participant["status"] == "CONFIRMED":
        new_players_needed = game["players_needed"] + 1
        await db.games.update_one(
            {"_id": ObjectId(participant["game_id"])},
            {
                "$set": {
                    "players_needed": new_players_needed,
                    "status": "OPEN"
                }
            }
        )
    
    await db.participants.delete_one({"_id": ObjectId(participant_id)})
    
    return {"message": "Participant removed"}

async def _promote_reserve_or_reopen(game_id: str, game: dict):
    """After a confirmed slot opens, promote first reserve or increment players_needed."""
    reserve = await db.participants.find_one({"game_id": game_id, "status": "RESERVE"})
    if reserve:
        await db.participants.update_one(
            {"_id": reserve["_id"]},
            {"$set": {"status": "CONFIRMED"}}
        )
        if reserve.get("user_id"):
            await db.notifications.insert_one({
                "user_id": reserve["user_id"],
                "type": "PROMOTED",
                "message": f"You've been promoted to confirmed for {game['venue']}!",
                "game_id": game_id,
                "created_at": datetime.utcnow(),
                "read": False
            })
    else:
        await db.games.update_one(
            {"_id": ObjectId(game_id)},
            {"$set": {"players_needed": game["players_needed"] + 1, "status": "OPEN"}}
        )

# Player withdraws themselves from a game
@api_router.post("/participants/withdraw")
async def withdraw_from_game(game_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]

    participant = await db.participants.find_one({"game_id": game_id, "user_id": user_id})
    if not participant:
        raise HTTPException(status_code=404, detail="You're not in this game")

    game = await db.games.find_one({"_id": ObjectId(game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    player_name = user["name"] if user else "A player"
    was_confirmed = participant["status"] == "CONFIRMED"

    await db.participants.delete_one({"_id": participant["_id"]})

    if was_confirmed:
        await _promote_reserve_or_reopen(game_id, game)

    await db.notifications.insert_one({
        "user_id": game["organiser_id"],
        "type": "PLAYER_WITHDREW",
        "message": f"{player_name} can't make it for {game['venue']}",
        "game_id": game_id,
        "player_name": player_name,
        "created_at": datetime.utcnow(),
        "read": False
    })

    return {"message": "You've been removed from the game", "was_confirmed": was_confirmed}

@api_router.delete("/games/{game_id}/participants/{participant_id}")
async def organiser_remove_participant(game_id: str, participant_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]

    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the organiser can remove players")

    try:
        participant = await db.participants.find_one({"_id": ObjectId(participant_id)})
    except:
        raise HTTPException(status_code=404, detail="Participant not found")
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    was_confirmed = participant["status"] == "CONFIRMED"
    await db.participants.delete_one({"_id": participant["_id"]})

    if was_confirmed:
        await _promote_reserve_or_reopen(game_id, game)

    if participant.get("user_id"):
        await db.notifications.insert_one({
            "user_id": participant["user_id"],
            "type": "REMOVED",
            "message": f"You've been removed from {game['venue']}",
            "game_id": game_id,
            "created_at": datetime.utcnow(),
            "read": False
        })

    return {"message": "Removed"}

@api_router.post("/games/{game_id}/attendance")
async def record_attendance(game_id: str, request: AttendanceRequest, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]

    try:
        game = await db.games.find_one({"_id": ObjectId(game_id)})
    except:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game["organiser_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the organiser can record attendance")
    if game.get("attendance_recorded"):
        raise HTTPException(status_code=400, detail="Attendance already recorded")

    for entry in request.attendance:
        try:
            participant = await db.participants.find_one({"_id": ObjectId(entry.participant_id)})
        except:
            continue
        if not participant or not participant.get("user_id"):
            continue  # Skip guests
        if entry.result == "shown":
            await db.users.update_one(
                {"_id": ObjectId(participant["user_id"])},
                {"$inc": {"games_shown": 1}}
            )
        elif entry.result == "no_show":
            await db.users.update_one(
                {"_id": ObjectId(participant["user_id"])},
                {"$inc": {"games_no_show": 1}}
            )

    await db.games.update_one(
        {"_id": ObjectId(game_id)},
        {"$set": {"attendance_recorded": True}}
    )

    return {"message": "Recorded"}

# Get notifications for a user
@api_router.get("/notifications")
async def get_notifications(token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    notifications_cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(20)
    notifications = await notifications_cursor.to_list(length=None)
    
    return [{
        "id": str(n["_id"]),
        "type": n["type"],
        "message": n["message"],
        "game_id": n.get("game_id"),
        "created_at": n["created_at"],
        "read": n.get("read", False)
    } for n in notifications]
@api_router.delete("/notifications")
async def clear_notifications(token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]

    await db.notifications.delete_many({"user_id": user_id})

    return {"message": "Notifications cleared"}
# Mark notification as read
@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": user_id},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

# Get unread notification count
@api_router.get("/notifications/count")
async def get_notification_count(token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"count": count}

@api_router.get("/my-games", response_model=List[GameResponse])
async def get_my_games(token: str):
    payload = verify_token(token)
    user_id = payload["user_id"]
    
    organiser_games_cursor = db.games.find({"organiser_id": user_id}).sort("date_time", 1)
    organiser_games = await organiser_games_cursor.to_list(length=None)
    
    participant_records = await db.participants.find({"user_id": user_id}).to_list(length=None)
    participant_game_ids = [ObjectId(p["game_id"]) for p in participant_records]
    
    participant_games = []
    if participant_game_ids:
        participant_games_cursor = db.games.find({"_id": {"$in": participant_game_ids}}).sort("date_time", 1)
        participant_games = await participant_games_cursor.to_list(length=None)
    
    all_games = organiser_games + participant_games
    
    game_responses = []
    for game in all_games:
        confirmed_count = await db.participants.count_documents({
            "game_id": str(game["_id"]),
            "status": "CONFIRMED"
        })
        reserve_count = await db.participants.count_documents({
            "game_id": str(game["_id"]),
            "status": "RESERVE"
        })
        
        game_responses.append(GameResponse(
            id=str(game["_id"]),
            organiser_id=game["organiser_id"],
            organiser_name=game["organiser_name"],
            venue=game["venue"],
            date_time=game["date_time"],
            players_needed=game["players_needed"],
            format=game["format"],
            subs=game.get("subs"),
            notes=game.get("notes"),
            status=game["status"],
            confirmed_count=confirmed_count,
            reserve_count=reserve_count,
            attendance_recorded=game.get("attendance_recorded", False)
        ))

    return game_responses

# Admin endpoints
@api_router.get("/admin/users")
async def get_all_users(token: str):
    payload = verify_token(token)
    user = await db.users.find_one({"_id": ObjectId(payload["user_id"])})
    
    if not user or user["email"] != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users_cursor = db.users.find()
    users = await users_cursor.to_list(length=None)
    
    return [{
        "id": str(u["_id"]),
        "name": u["name"],
        "email": u["email"],
        "area": u.get("area") or u.get("postcode"),
        "bio": u.get("bio"),
        "games_played": u.get("games_played", 0),
        "games_confirmed": u.get("games_confirmed", 0),
        "no_shows": u.get("no_shows", 0),
        "created_at": u.get("created_at")
    } for u in users]

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, token: str):
    payload = verify_token(token)
    admin_user = await db.users.find_one({"_id": ObjectId(payload["user_id"])})
    
    if not admin_user or admin_user["email"] != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent admin from deleting themselves
    if user_id == payload["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Check if user exists
    user_to_delete = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's participations
    await db.participants.delete_many({"user_id": user_id})
    
    # Delete games organised by this user
    await db.games.delete_many({"organiser_id": user_id})
    
    # Delete the user
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": "User deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
