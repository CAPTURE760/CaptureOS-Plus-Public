"""图片验证码生成。

使用内存存储验证码（key=验证码ID, value=验证码文本），TTL 5 分钟。
单机部署足够；如后续多实例部署需换成 Redis。
"""
import io
import random
import string
import time
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

# 内存存储：captcha_id -> (text, expire_at)
_store: dict[str, tuple[str, float]] = {}
_TTL = 300  # 5 分钟

# 排除易混淆字符 0/O/1/l/I
_CHARS = string.ascii_uppercase + string.digits
_CHARS = _CHARS.replace("O", "").replace("0", "").replace("I", "").replace("1", "").replace("L", "")


def _cleanup() -> None:
    """清理过期验证码。"""
    now = time.time()
    expired = [k for k, (_, exp) in _store.items() if exp < now]
    for k in expired:
        del _store[k]


def generate_captcha() -> tuple[str, bytes]:
    """生成验证码，返回 (captcha_id, png_bytes)。"""
    _cleanup()
    text = "".join(random.choices(_CHARS, k=4))
    captcha_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
    _store[captcha_id] = (text, time.time() + _TTL)

    # 生成图片
    width, height = 120, 40
    img = Image.new("RGB", (width, height), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)

    # 干扰线
    for _ in range(4):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        draw.line([(x1, y1), (x2, y2)], fill=(random.randint(100, 200),) * 3, width=1)

    # 干扰点
    for _ in range(30):
        x = random.randint(0, width)
        y = random.randint(0, height)
        draw.point((x, y), fill=(random.randint(100, 200),) * 3)

    # 文字（用默认字体，避免依赖系统字体文件）
    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except (OSError, IOError):
        font = ImageFont.load_default()

    for i, ch in enumerate(text):
        x = 15 + i * 26 + random.randint(-3, 3)
        y = random.randint(2, 8)
        draw.text((x, y), ch, fill=(random.randint(0, 100),) * 3, font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return captcha_id, buf.getvalue()


def verify_captcha(captcha_id: str, user_input: str) -> bool:
    """校验验证码（不区分大小写，校验后立即失效）。"""
    entry: Optional[tuple[str, float]] = _store.pop(captcha_id, None)
    if entry is None:
        return False
    text, expire_at = entry
    if time.time() > expire_at:
        return False
    return user_input.strip().upper() == text.upper()
