from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)
    is_admin: bool = False


class UserUpdate(BaseModel):
    password: str | None = Field(None, min_length=6, max_length=100)
    is_admin: bool | None = None
    is_active: bool | None = None


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_id: str
    captcha_code: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
