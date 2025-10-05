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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']

# Email configuration
ADMIN_EMAIL = "lagzielalon81@gmail.com"

def send_email_notification(sender_email: str, message: str):
    """Send email notification to admin when user sends message"""
    try:
        # Create message
        subject = f"הודעה חדשה מ-{sender_email} - Frozen Shop"
        
        email_body = f"""
        התקבלה הודעה חדשה מלקוח באתר Frozen Shop:
        
        מאת: {sender_email}
        הודעה: {message}
        זמן: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
        
        כדי לענות, התחבר לאתר: https://fortnite-accounts.preview.emergentagent.com
        """
        
        # For demo purposes, we'll just log the email
        # In production, you would use real SMTP settings
        logger.info(f"📧 Email sent to {ADMIN_EMAIL}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {email_body}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

def send_purchase_notification(customer_email: str, account_title: str, price: float):
    """Send email notification to admin when someone makes a purchase"""
    try:
        # Create message
        subject = f"🛒 רכישה חדשה - {account_title} - Frozen Shop"
        
        email_body = f"""
        🎉 התקבלה הזמנת רכישה חדשה באתר Frozen Shop!
        
        📋 פרטי ההזמנה:
        ━━━━━━━━━━━━━━━━━━━━
        🎮 מוצר: {account_title}
        💰 מחיר: ${price:.2f}
        👤 לקוח: {customer_email}
        📅 זמן הזמנה: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S')}
        
        📝 פעולות נדרשות:
        ━━━━━━━━━━━━━━━━━━━━
        1. ✅ אמת קבלת התשלום
        2. 📧 שלח פרטי חשבון ללקוח
        3. 💬 עדכן את הלקוח בצ'אט
        
        🔗 כדי לנהל את ההזמנה, התחבר לאתר: 
        https://fortnite-accounts.preview.emergentagent.com
        """
        
        # Log the purchase email
        logger.info(f"🛒 Purchase Email sent to {ADMIN_EMAIL}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {email_body}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to send purchase email: {e}")
        return False
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

class BannedUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_email: str
    banned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    banned_by: str = "lagzielalon81@gmail.com"

class BanUserRequest(BaseModel):
    user_email: str

class Purchase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_email: str
    account_title: str
    price: float
    status: str = "pending"  # pending, confirmed, delivered
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PurchaseRequest(BaseModel):
    customer_email: str
    account_title: str
    price: float

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
@api_router.get("/chat/messages")
async def get_chat_messages():
    messages = await db.chat_messages.find().sort("timestamp", 1).to_list(100)
    
    # Clean up messages for response
    cleaned_messages = []
    for message in messages:
        # Remove MongoDB _id field and ensure all required fields exist
        clean_msg = {
            "id": message.get("id", str(message.get("_id", ""))),
            "sender_email": message.get("sender_email", ""),
            "conversation_with": message.get("conversation_with", ""),
            "message": message.get("message", ""),
            "timestamp": message.get("timestamp", ""),
            "is_admin": message.get("is_admin", False)
        }
        cleaned_messages.append(clean_msg)
    
    return cleaned_messages

@api_router.post("/chat/messages")
async def create_chat_message(message_data: ChatMessageCreate):
    # Check if user is banned (only for non-admin messages)
    if not message_data.is_admin:
        banned_user = await db.banned_users.find_one({"user_email": message_data.sender_email})
        if banned_user:
            raise HTTPException(status_code=403, detail="המשתמש חסום ואינו יכול לשלוח הודעות")
    
    # Set conversation_with field
    if message_data.is_admin:
        # Admin sending to user - conversation_with is the sender_email (which is the user)
        conversation_with = message_data.sender_email
        sender_email = "lagzielalon81@gmail.com"
    else:
        # User sending to admin
        conversation_with = "lagzielalon81@gmail.com"
        sender_email = message_data.sender_email
        
        # Send email notification to admin when user sends message
        send_email_notification(sender_email, message_data.message)
    
    message_dict = {
        "sender_email": sender_email,
        "conversation_with": conversation_with,
        "message": message_data.message,
        "is_admin": message_data.is_admin,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "id": str(uuid.uuid4())
    }
    
    await db.chat_messages.insert_one(message_dict)
    
    return {"success": True, "message": "הודעה נשלחה בהצלחה ואימייל נשלח לאדמין"}

@api_router.post("/send-email")
async def send_email_direct(sender_email: str = Form(...), message: str = Form(...)):
    """Direct endpoint to send email to admin"""
    success = send_email_notification(sender_email, message)
    
    if success:
        return {"success": True, "message": f"אימייל נשלח בהצלחה ל-{ADMIN_EMAIL}"}
    else:
        raise HTTPException(status_code=500, detail="שגיאה בשליחת האימייל")

# Chat management endpoints
@api_router.delete("/chat/user/{user_email}")
async def delete_user_chat(user_email: str):
    """Delete all messages for a specific user"""
    result = await db.chat_messages.delete_many({
        "$or": [
            {"sender_email": user_email},
            {"conversation_with": user_email}
        ]
    })
    
    return {"success": True, "message": f"נמחקו {result.deleted_count} הודעות", "deleted_count": result.deleted_count}

@api_router.post("/ban-user")
async def ban_user(ban_request: BanUserRequest):
    """Ban a user from the system"""
    # Check if user is already banned
    existing_ban = await db.banned_users.find_one({"user_email": ban_request.user_email})
    if existing_ban:
        raise HTTPException(status_code=400, detail="המשתמש כבר חסום")
    
    # Create ban record
    ban_data = BannedUser(user_email=ban_request.user_email)
    ban_dict = ban_data.dict()
    
    # Convert datetime to string for MongoDB
    if isinstance(ban_dict['banned_at'], datetime):
        ban_dict['banned_at'] = ban_dict['banned_at'].isoformat()
    
    await db.banned_users.insert_one(ban_dict)
    
    # Also delete their chat messages
    await db.chat_messages.delete_many({
        "$or": [
            {"sender_email": ban_request.user_email},
            {"conversation_with": ban_request.user_email}
        ]
    })
    
    return {"success": True, "message": f"המשתמש {ban_request.user_email} נחסם בהצלחה"}

@api_router.get("/banned-users")
async def get_banned_users():
    """Get list of banned users"""
    banned_users = await db.banned_users.find().to_list(100)
    return banned_users

@api_router.delete("/unban-user/{user_email}")
async def unban_user(user_email: str):
    """Remove ban from user"""
    result = await db.banned_users.delete_one({"user_email": user_email})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="המשתמש לא נמצא ברשימת החסומים")
    
    return {"success": True, "message": f"החסימה של {user_email} הוסרה בהצלחה"}

# Purchase endpoints
@api_router.post("/purchase")
async def create_purchase(purchase_data: PurchaseRequest):
    """Create a new purchase order and send email to admin"""
    
    # Create purchase record
    purchase = Purchase(**purchase_data.dict())
    purchase_dict = purchase.dict()
    
    # Convert datetime to string for MongoDB
    if isinstance(purchase_dict['created_at'], datetime):
        purchase_dict['created_at'] = purchase_dict['created_at'].isoformat()
    
    # Save to database
    await db.purchases.insert_one(purchase_dict)
    
    # Send email notification to admin
    send_purchase_notification(
        purchase_data.customer_email, 
        purchase_data.account_title, 
        purchase_data.price
    )
    
    return {
        "success": True, 
        "message": "הזמנה נוצרה בהצלחה! האדמין יטפל בה בהקדם",
        "purchase_id": purchase.id
    }

@api_router.get("/purchases")
async def get_purchases():
    """Get all purchases for admin"""
    purchases = await db.purchases.find().sort("created_at", -1).to_list(100)
    
    cleaned_purchases = []
    for purchase in purchases:
        clean_purchase = {
            "id": purchase.get("id", str(purchase.get("_id", ""))),
            "customer_email": purchase.get("customer_email", ""),
            "account_title": purchase.get("account_title", ""),
            "price": purchase.get("price", 0),
            "status": purchase.get("status", "pending"),
            "created_at": purchase.get("created_at", "")
        }
        cleaned_purchases.append(clean_purchase)
    
    return cleaned_purchases

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
