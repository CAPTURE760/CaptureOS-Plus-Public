from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.auth.deps import get_current_user
from app.models import FileAttachment, ENTITY_TYPES
from app.models.user import User

router = APIRouter(prefix="/file-attachments", tags=["file-attachments"])


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_files(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取指定实体的所有文件附件"""
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="无效的实体类型")

    result = await db.execute(
        select(FileAttachment).where(
            FileAttachment.entity_type == entity_type,
            FileAttachment.entity_id == entity_id,
            FileAttachment.is_active == True
        ).order_by(FileAttachment.created_at.desc())
    )
    files = result.scalars().all()

    return [file.to_dict() for file in files]


@router.delete("/{file_id}")
async def delete_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除文件附件（软删除）"""
    result = await db.execute(
        select(FileAttachment).where(
            FileAttachment.id == file_id,
            FileAttachment.is_active == True
        )
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    file.is_active = False
    await db.commit()

    return {"message": "文件已删除"}


@router.get("/{file_id}")
async def get_file_info(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取文件附件信息"""
    result = await db.execute(
        select(FileAttachment).where(
            FileAttachment.id == file_id,
            FileAttachment.is_active == True
        )
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")

    return file.to_dict()