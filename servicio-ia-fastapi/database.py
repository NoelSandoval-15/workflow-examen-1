import os
from motor.motor_asyncio import AsyncIOMotorClient


MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "examensw1")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

def get_database():
    if db_instance.client is None:
        db_instance.client = AsyncIOMotorClient(MONGODB_URL)
        db_instance.db = db_instance.client[DATABASE_NAME]
    return db_instance.db

def close_database():
    if db_instance.client is not None:
        db_instance.client.close()
        db_instance.client = None
        db_instance.db = None
