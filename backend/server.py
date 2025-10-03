from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class GameAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    price: float
    seller: str = "Admin"
    image_data: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    game_type: str = "Fortnite"

class GameAccountCreate(BaseModel):
    title: str
    description: str
    price: float
    access_code: str

class CodeVerification(BaseModel):
    code: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_email: str
    conversation_with: str  # Email of the other person in conversation
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_admin: bool = False

class ChatMessageCreate(BaseModel):
    sender_email: str
    conversation_with: str = None
    message: str
    is_admin: bool = False

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Gaming Accounts API"}

# Status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Code verification endpoint
@api_router.post("/verify-code")
async def verify_access_code(code_data: CodeVerification):
    if code_data.code == "ALON123GG1":
        return {"valid": True, "message": "קוד נכון! תוכל להעלות מוצר"}
    else:
        return {"valid": False, "message": "קוד שגוי!"}

# Game accounts endpoints
@api_router.get("/accounts", response_model=List[GameAccount])
async def get_accounts():
    accounts = await db.game_accounts.find().sort("created_at", -1).to_list(100)
    return [GameAccount(**account) for account in accounts]

@api_router.post("/accounts")
async def create_account(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    access_code: str = Form(...),
    image: UploadFile = File(None)
):
    # Verify access code
    if access_code != "ALON123GG1":
        raise HTTPException(status_code=403, detail="קוד גישה שגוי")
    
    # Handle image upload
    image_data = None
    if image:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="יש להעלות קובץ תמונה")
        
        content = await image.read()
        image_data = base64.b64encode(content).decode('utf-8')
        image_data = f"data:{image.content_type};base64,{image_data}"
    
    # Create account object
    account_data = {
        "title": title,
        "description": description, 
        "price": price,
        "image_data": image_data
    }
    
    account = GameAccount(**account_data)
    account_dict = account.dict()
    
    # Convert datetime to string for MongoDB
    if isinstance(account_dict['created_at'], datetime):
        account_dict['created_at'] = account_dict['created_at'].isoformat()
    
    result = await db.game_accounts.insert_one(account_dict)
    
    return {"success": True, "id": account.id, "message": "חשבון נוסף בהצלחה!"}

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    result = await db.game_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="חשבון לא נמצא")
    return {"success": True, "message": "חשבון נמחק בהצלחה"}

# Chat endpoints
@api_router.get("/chat/messages", response_model=List[ChatMessage])
async def get_chat_messages():
    messages = await db.chat_messages.find().sort("timestamp", 1).to_list(100)
    return [ChatMessage(**message) for message in messages]

@api_router.post("/chat/messages")
async def create_chat_message(message_data: ChatMessageCreate):
    # Set conversation_with field
    if message_data.is_admin:
        # Admin sending to user - conversation_with is the sender_email (which is the user)
        conversation_with = message_data.sender_email
        sender_email = "lagzielalon81@gmail.com"
    else:
        # User sending to admin
        conversation_with = "lagzielalon81@gmail.com"
        sender_email = message_data.sender_email
    
    message_dict = {
        "sender_email": sender_email,
        "conversation_with": conversation_with,
        "message": message_data.message,
        "is_admin": message_data.is_admin,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "id": str(uuid.uuid4())
    }
    
    await db.chat_messages.insert_one(message_dict)
    
    return {"success": True, "message": "הודעה נשלחה בהצלחה"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
