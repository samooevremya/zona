"""Bake G8 loner jackets and camp transitions from the registered original artwork."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ART = Path(__file__).resolve().parents[1] / "art/g8/src"
POSES = ("idle", "walk_left", "walk_pass_left", "walk_right", "walk_pass_right",
         "crouch", "captive", "wounded", "fall_start", "fall_mid", "dead", "dead2")
# Fabric boundaries on the original images. Keep the backpack, straps, gloves,
# trousers and exposed face in their original material.
def poly(text):
    return [tuple(map(int, xy.split(","))) for xy in text.split()]

def jacket(image, outlines, palette):
    mask = Image.new("L", image.size)
    for shape in outlines:
        ImageDraw.Draw(mask).polygon(poly(shape), fill=255)
    weight = np.asarray(mask.filter(ImageFilter.GaussianBlur(1.3)))[..., None] / 255
    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[..., :3].astype(float)
    lum = rgb @ [0.30, 0.59, 0.11]
    ramp = np.array(palette)
    fabric = np.stack([np.interp(lum, [0, 46, 95, 152, 235], ramp[:, c])
                       for c in range(3)], axis=-1)
    rgba[..., :3] = np.rint(rgb * (1 - weight) + fabric * weight)
    return Image.fromarray(rgba)

HOOD = "57,66 63,61 79,60 86,70 87,89 77,98 66,98 57,89"
STAND = [HOOD, "52,65 53,85 55,97 64,105 59,112 47,113 33,97 30,78 38,69",
         "90,67 102,70 112,81 111,97 96,113 84,110 81,104 88,95"]
SEAT = [
    ["62,49 68,41 82,40 90,47 92,69 77,78 62,71",
     "56,43 58,66 47,79 49,85 39,83 22,75 21,66 37,53",
     "97,47 111,58 121,83 104,106 93,101 98,87 92,74"],
    ["61,66 70,58 83,59 90,68 90,88 77,96 63,88",
     "55,58 57,78 51,93 55,110 44,114 36,98 36,83 44,64",
     "94,59 106,69 114,90 99,117 87,113 95,92"],
    ["64,63 72,55 85,56 91,65 93,87 79,96 65,88",
     "56,53 58,71 48,82 48,87 39,90 29,73 28,62",
     "97,57 109,67 117,94 103,121 90,117 96,94"],
    ["59,65 67,58 84,59 89,70 88,88 73,97 60,89",
     "56,59 55,83 51,90 56,99 46,105 35,92 31,80 43,63",
     "92,61 104,69 112,83 100,105 88,101 92,90"],
]
FALL = ["79,65 89,60 104,61 116,72 115,94 101,104 84,99 77,87",
        "75,61 74,85 59,90 51,106 40,101 49,83 62,67",
        "117,65 135,76 147,99 137,105 126,91 116,90"]
PRONE = ["81,46 84,28 94,19 106,20 115,36 112,48 104,43 103,31 93,30 89,42",
         "82,43 83,64 72,77 60,94 50,89 62,66 72,47",
         "110,44 122,46 141,88 130,94 118,75 111,67",
         "78,88 113,87 117,100 96,96 76,100"]
SPECIAL = {
    "crouch": [HOOD, "54,63 56,89 50,99 55,109 42,116 30,95 31,76",
               "92,64 110,72 115,94 99,116 86,109 92,95"],
    "captive": ["80,99 88,89 105,89 115,101 114,118 97,131 81,121",
                "77,89 76,114 67,123 60,110 60,98",
                "119,89 132,97 132,110 122,124 118,112"],
    "wounded": ["81,84 91,77 107,80 116,90 113,107 99,117 82,108",
                "73,78 74,99 84,105 81,119 62,114 50,109 53,94",
                "117,81 129,90 133,111 140,121 131,126 117,112"],
    "fall_start": FALL,
    "fall_mid": ["84,55 86,43 94,34 104,34 114,49 111,57 106,54 101,43 94,44 90,57",
                 "83,54 83,76 65,102 52,97 68,68",
                 "110,55 122,59 141,97 130,102 114,80",
                 "78,104 115,103 120,113 95,110 75,114"],
    "dead": PRONE,
    "dead2": ["84,40 80,28 85,20 98,19 109,32 104,45 97,35 89,30 90,40",
              "80,44 83,64 63,94 51,89 66,60",
              "110,39 127,47 138,64 133,72 114,67 103,55",
              "87,88 121,81 125,92 104,94 88,99"],
}
PALETTES = {
    "white": [(13,14,13), (68,67,61), (145,142,128), (204,200,182), (237,232,213)],
    "beige": [(14,13,11), (66,54,38), (130,107,75), (179,153,111), (215,189,146)],
    "brown": [(12,10,9), (50,33,25), (94,63,44), (137,96,67), (181,138,99)],
}

def blend(a, b, t):
    # Interpolate premultiplied pixels to keep dark fringes off the shoulders.
    return Image.blend(a.convert("RGBa"), b.convert("RGBa"), t).convert("RGBA")

def lean(image, dx, dy):
    # Shift shoulders over the planted feet, fading the offset below the knees.
    mesh = []
    for y in range(0, 168, 4):
        def offset(v):
            t = np.clip((137 - v) / 52, 0, 1)
            return dx * t, dy * t
        x0, y0 = offset(y)
        x1, y1 = offset(y + 4)
        mesh.append(((0,y,144,y+4), (-x0,y-y0,-x1,y+4-y1,144-x1,y+4-y1,144-x0,y-y0)))
    return image.transform(image.size, Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)

def bake():
    source = Image.open(ART / "camp_rise.webp").convert("RGBA")
    for name, palette in PALETTES.items():
        atlas = Image.new("RGBA", (2448, 384))
        standing = {}
        for i, pose in enumerate(POSES):
            im = Image.open(ART / f"loner_{pose}.png")
            standing[pose] = jacket(im, SPECIAL.get(pose, STAND), palette)
            atlas.paste(standing[pose], (i * 192, 168))
        keys = [jacket(source.crop((i*576,0,i*576+144,168)), shapes, palette)
                for i, shapes in enumerate(SEAT)]
        # Folded legs and a low one-knee crouch. Keep left/right
        # handedness consistent at the join to the common standing frame.
        if name == "white":
            rest, middle = keys[2], keys[1]
        elif name == "beige":
            rest, middle = ImageOps.mirror(keys[1]), ImageOps.mirror(keys[2])
        else:
            rest, middle = lean(keys[3], -4, 2), keys[2]
        # Register the seated shoulders against the upright jacket. Boots can
        # extend beyond the torso without magnifying the entire person.
        def register(frame, factor):
            size=tuple(round(v*factor) for v in frame.size)
            small=frame.resize(size, Image.Resampling.LANCZOS)
            cell=Image.new('RGBA', frame.size)
            cell.paste(small, tuple((a-b)//2 for a,b in zip(frame.size,size)))
            return cell
        rest=register(rest, .85)
        middle=register(middle, .90)
        knots = [(0, rest), (3, lean(rest, 2, 6)), (7, middle),
                 (12, keys[3]), (16, standing["idle"])]
        for (start, a), (end, b) in zip(knots, knots[1:]):
            for i in range(start, end + 1):
                t = (i - start) / (end - start)
                atlas.paste(blend(a, b, t*t*(3-2*t)), (i*144, 0))
        atlas.save(ART / f"jacket_{name}.webp", quality=91, method=6)

if __name__ == "__main__":
    bake()
