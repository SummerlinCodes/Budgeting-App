"""Generate PNG icons (stdlib only)."""
import zlib, struct, os, math
OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)
BG, FG = (11, 18, 32), (56, 189, 248)

def png(size, radius_frac, maskable):
    r = size * radius_frac
    cx = cy = size / 2
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            inside = math.hypot(x - cx, y - cy) <= r
            # $ bar: vertical stroke + simple S-ish blocks in bg color on the disc
            c = FG if inside else BG
            if inside:
                u, v = (x - cx) / r, (y - cy) / r
                if abs(u) < 0.07 and abs(v) < 0.85: c = BG
                elif abs(v + 0.35) < 0.09 and -0.45 < u < 0.45: c = BG
                elif abs(v) < 0.09 and -0.45 < u < 0.45: c = BG
                elif abs(v - 0.35) < 0.09 and -0.45 < u < 0.45: c = BG
                elif abs(u + 0.45) < 0.09 and -0.35 < v < 0.0: c = BG
                elif abs(u - 0.45) < 0.09 and 0.0 < v < 0.35: c = BG
            row += bytes(c) + b"\xff"
        rows.append(bytes(row))
    raw = b"".join(rows)
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

for name, size, frac in [("icon-192.png", 192, .30), ("icon-512.png", 512, .30), ("icon-maskable-512.png", 512, .26)]:
    with open(os.path.join(OUT, name), "wb") as f:
        f.write(png(size, frac, "maskable" in name))
print("icons written")
