"""產生 PWA icons。設計：深色圓角方塊背景 + 螢光綠硬幣(¥/$)造型，呼應站內配色。"""
from PIL import Image, ImageDraw, ImageFont

BG = (17, 17, 17, 255)        # --bg-primary
CARD = (26, 26, 26, 255)      # --bg-card
ACCENT = (200, 255, 87, 255)  # --accent
ACCENT_DARK = (168, 214, 60, 255)

SIZE = 512


def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def make_icon():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 背景圓角方塊
    rounded_rect(d, (0, 0, SIZE, SIZE), radius=112, fill=BG)

    # 底部帳本卡片（象徵記帳本）
    card_w, card_h = 300, 210
    card_x = (SIZE - card_w) // 2
    card_y = SIZE - 128 - card_h
    rounded_rect(d, (card_x, card_y, card_x + card_w, card_y + card_h), radius=24, fill=CARD)
    d.rectangle((card_x, card_y + 40, card_x + card_w, card_y + 44), fill=(255, 255, 255, 25))

    # 帳本上的三條線（記帳項目）
    line_x0 = card_x + 36
    line_x1 = card_x + card_w - 36
    for i, ly in enumerate([card_y + 78, card_y + 112, card_y + 146]):
        w = line_x1 if i < 2 else line_x1 - 60
        d.rounded_rectangle((line_x0, ly, w, ly + 14), radius=7, fill=(255, 255, 255, 60))

    # 螢光綠硬幣，疊在帳本右上方
    coin_r = 118
    coin_cx = SIZE // 2 + 30
    coin_cy = card_y - 10
    d.ellipse(
        (coin_cx - coin_r, coin_cy - coin_r, coin_cx + coin_r, coin_cy + coin_r),
        fill=ACCENT,
        outline=ACCENT_DARK,
        width=8,
    )
    inner_r = coin_r - 26
    d.ellipse(
        (coin_cx - inner_r, coin_cy - inner_r, coin_cx + inner_r, coin_cy + inner_r),
        outline=(17, 17, 17, 160),
        width=6,
    )

    # 硬幣上的 $ 符號
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 130)
    text = "$"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((coin_cx - tw / 2 - bbox[0], coin_cy - th / 2 - bbox[1]), text, font=font, fill=BG)

    return img


def maskable_variant(img):
    # maskable: 內容縮小置中，四周留 20% safe zone 給系統裁切
    canvas = Image.new("RGBA", (SIZE, SIZE), BG)
    scale = 0.7
    small = img.resize((int(SIZE * scale), int(SIZE * scale)), Image.LANCZOS)
    offset = ((SIZE - small.width) // 2, (SIZE - small.height) // 2)
    canvas.paste(small, offset, small)
    return canvas


if __name__ == "__main__":
    base = make_icon()
    base.save("icons/icon-512.png")
    base.resize((192, 192), Image.LANCZOS).save("icons/icon-192.png")
    base.resize((180, 180), Image.LANCZOS).save("icons/apple-touch-icon.png")
    base.resize((32, 32), Image.LANCZOS).save("icons/favicon-32.png")

    mask = maskable_variant(base)
    mask.save("icons/icon-maskable-512.png")
    mask.resize((192, 192), Image.LANCZOS).save("icons/icon-maskable-192.png")

    print("icons generated")
