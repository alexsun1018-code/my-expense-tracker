"""產生 PWA icons。設計：深色漸層背景 + 成長長條圖（記帳統計）+ 立體硬幣與上升趨勢線（投資），呼應站內配色。"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

BG_TOP = (28, 31, 26)
BG_BOTTOM = (10, 10, 10)
ACCENT = (200, 255, 87)
ACCENT_LIGHT = (226, 255, 158)
ACCENT_DARK = (120, 158, 40)
BAR_DIM = (70, 92, 34)

SIZE = 512


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return m


def vertical_gradient(size, top, bottom):
    grad = Image.linear_gradient("L").resize((size, size))
    out = Image.new("RGBA", (size, size))
    top_img = Image.new("RGBA", (size, size), top + (255,))
    bottom_img = Image.new("RGBA", (size, size), bottom + (255,))
    out = Image.composite(bottom_img, top_img, grad)
    return out


def radial_sphere(diameter, light, dark):
    """回傳一個中心偏亮、邊緣偏暗的立體球體漸層圖（RGBA，圓形遮罩），光源置於左上方。"""
    big = int(diameter * 1.3)
    grad = Image.radial_gradient("L").resize((big, big))
    light_img = Image.new("RGBA", (big, big), light + (255,))
    dark_img = Image.new("RGBA", (big, big), dark + (255,))
    sphere_big = Image.composite(light_img, dark_img, grad)
    offset = int(diameter * 0.14)
    sphere = sphere_big.crop((offset, offset, offset + diameter, offset + diameter))

    circle_mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(circle_mask).ellipse((0, 0, diameter, diameter), fill=255)
    sphere.putalpha(circle_mask)
    return sphere


def make_icon():
    img = vertical_gradient(SIZE, BG_TOP, BG_BOTTOM)
    mask = rounded_mask(SIZE, 112)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(img, (0, 0), mask)
    d = ImageDraw.Draw(canvas)

    # ── 成長長條圖（記帳統計威）──
    bar_w = 62
    gap = 24
    base_y = 400
    heights = [90, 150, 220]
    colors = [BAR_DIM, ACCENT_DARK, ACCENT]
    start_x = 92
    bar_tops = []
    for i, (h, c) in enumerate(zip(heights, colors)):
        x0 = start_x + i * (bar_w + gap)
        x1 = x0 + bar_w
        y1 = base_y
        y0 = base_y - h
        d.rounded_rectangle((x0, y0, x1, y1), radius=16, fill=c + (255,))
        bar_tops.append((x0 + bar_w / 2, y0))

    # ── 上升趨勢線（投資成長）──
    trend_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    td = ImageDraw.Draw(trend_layer)
    trend_points = [bar_tops[0], bar_tops[1], bar_tops[2], (398, 150)]
    td.line(trend_points, fill=ACCENT_LIGHT + (255,), width=10, joint="curve")
    # 箭頭
    ax, ay = trend_points[-1]
    td.polygon([(ax, ay - 26), (ax - 24, ay + 14), (ax + 24, ay + 14)], fill=ACCENT_LIGHT + (255,))
    glow = trend_layer.filter(ImageFilter.GaussianBlur(10))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(trend_layer)

    # ── 立體硬幣（資產／投資）──
    coin_d = 234
    coin_cx, coin_cy = 352, 190

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        (coin_cx - coin_d / 2 + 10, coin_cy - coin_d / 2 + 18,
         coin_cx + coin_d / 2 + 10, coin_cy + coin_d / 2 + 18),
        fill=(0, 0, 0, 130)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    canvas.alpha_composite(shadow)

    coin = radial_sphere(coin_d, ACCENT_LIGHT, ACCENT_DARK)
    canvas.alpha_composite(coin, (int(coin_cx - coin_d / 2), int(coin_cy - coin_d / 2)))

    cd = ImageDraw.Draw(canvas)
    inner_r = coin_d / 2 - 22
    cd.ellipse(
        (coin_cx - inner_r, coin_cy - inner_r, coin_cx + inner_r, coin_cy + inner_r),
        outline=(20, 30, 8, 110), width=5,
    )

    # 高光弧（限制在硬幣圓形範圍內，避免溢出）
    highlight = Image.new("RGBA", (coin_d, coin_d), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    hd.ellipse(
        (coin_d * 0.22, coin_d * 0.10, coin_d * 0.50, coin_d * 0.24),
        fill=(255, 255, 255, 130)
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(6))
    coin_circle_mask = Image.new("L", (coin_d, coin_d), 0)
    ImageDraw.Draw(coin_circle_mask).ellipse((0, 0, coin_d, coin_d), fill=255)
    highlight.putalpha(ImageChops.multiply(highlight.getchannel("A"), coin_circle_mask))
    canvas.alpha_composite(highlight, (int(coin_cx - coin_d / 2), int(coin_cy - coin_d / 2)))

    # $ 符號
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 118)
    text = "$"
    bbox = cd.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cd.text((coin_cx - tw / 2 - bbox[0] + 2, coin_cy - th / 2 - bbox[1] + 2), text, font=font, fill=(20, 30, 8, 130))
    cd.text((coin_cx - tw / 2 - bbox[0], coin_cy - th / 2 - bbox[1]), text, font=font, fill=(24, 28, 10, 255))

    # 外框描邊，讓整體在小尺寸下更銳利
    border = ImageDraw.Draw(canvas)
    border.rounded_rectangle((2, 2, SIZE - 2, SIZE - 2), radius=110, outline=(255, 255, 255, 18), width=3)

    return canvas


def maskable_variant(img):
    canvas = Image.new("RGBA", (SIZE, SIZE), BG_BOTTOM + (255,))
    scale = 0.72
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
