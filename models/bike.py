import sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *

reset()
OR = 0xff5a00; BK = 0x141414; WH = 0xf2f2f2; SV = 0xb4b8be; DK = 0x2b2b2e; LM = 0xc8ff00; GR = 0x55585e
WR = 0.475

def P(x, y3, z3):  # three coords -> blender
    return (x, -z3, y3)

# ---------------------------------------------------------------- wheel
def wheel(name, disc_side=1):
    parts = []
    parts.append(torus(name + "_tyre", 0.36, 0.09, rot=(0, math.pi / 2, 0), col=0x1a1a1a, seg=28, rseg=10))
    knob_objs = []
    for row in (-1, 1):
        for i in range(20):
            a = i / 20 * math.pi * 2 + (0.08 if row > 0 else 0)
            k = box(name + '_k', (0.07, 0.06, 0.11), loc=(row * 0.035, math.cos(a) * 0.45, math.sin(a) * 0.45),
                    rot=(a - math.pi / 2, 0, row * 0.3), col=0x0e0e0e, bevel=0.008, native=True)
            knob_objs.append(k)
    parts += knob_objs
    parts.append(torus(name + "_rim", 0.27, 0.022, rot=(0, math.pi / 2, 0), col=SV, seg=28, rseg=6))
    parts.append(cyl(name + "_rimb", 0.28, 0.28, 0.07, rot=(0, math.pi / 2, 0), col=0x222226, seg=28, cap=False))
    parts.append(cyl(name + '_hub', 0.07, 0.07, 0.16, rot=(0, math.pi / 2, 0), col=OR, seg=12, bevel=0.01))
    for i in range(12):
        a = i / 12 * math.pi
        s = cyl(name + '_sp', 0.006, 0.006, 0.54, rot=(a, 0, 0), col=SV, seg=4, cap=False)
        parts.append(s)
    parts.append(cyl(name + "_disc", 0.17, 0.17, 0.012, loc=(0.075 * disc_side, 0, 0), rot=(0, math.pi / 2, 0), col=SV, seg=24))
    parts.append(cyl(name + '_discin', 0.08, 0.08, 0.016, loc=(0.075 * disc_side, 0, 0), rot=(0, math.pi / 2, 0), col=DK, seg=12))
    return join(parts, name)

rear = wheel('rear_wheel', 1)
rear.location = P(0, WR, 0.98)
select_only(rear); bpy.ops.object.transform_apply(location=True)
set_origin(rear, P(0, WR, 0.98))
front = wheel('front_wheel', 1)
front.location = P(0, WR, -0.98)
select_only(front); bpy.ops.object.transform_apply(location=True)
set_origin(front, P(0, WR, -0.98))

# ---------------------------------------------------------------- swingarm (pivot near engine rear)
sw_pivot = P(0, 0.72, 0.26)
sw = []
for s in (-1, 1):
    sw.append(tube('sw_arm', [P(s * 0.12, 0.72, 0.26), P(s * 0.13, 0.62, 0.6), P(s * 0.13, WR + 0.02, 0.96)], 0.04, SV))
    sw.append(box('sw_cap', (0.05, 0.12, 0.09), loc=P(s * 0.13, WR, 0.98), col=DK, bevel=0.01))
sw.append(tube('sw_brace', [P(-0.13, 0.62, 0.5), P(0.13, 0.62, 0.5)], 0.03, SV))
sw.append(cyl('sprocket', 0.16, 0.16, 0.014, loc=P(0.19, WR, 0.98), rot=(0, math.pi / 2, 0), col=SV, seg=20))
sw.append(tube('chain_t', [P(0.19, WR + 0.16, 0.98), P(0.19, 0.6, 0.35)], 0.012, 0x101010, seg=4))
sw.append(tube('chain_b', [P(0.19, WR - 0.16, 0.98), P(0.19, 0.45, 0.35)], 0.012, 0x101010, seg=4))
sw.append(cyl('countersprocket', 0.06, 0.06, 0.02, loc=P(0.19, 0.55, 0.34), rot=(0, math.pi / 2, 0), col=SV, seg=12))
swingarm = join(sw, 'swingarm')
set_origin(swingarm, sw_pivot)
parent(rear, swingarm)

# ---------------------------------------------------------------- fork upper / lower
head = P(0, 1.4, -0.7)
axle = P(0, WR, -0.98)
fl = []
for s in (-1, 1):
    fl.append(tube('leg', [P(s * 0.15, 0.98, -0.88), P(s * 0.15, WR, -0.98)], 0.06, 0x16161a))
    fl.append(box('axleclamp', (0.05, 0.1, 0.1), loc=P(s * 0.17, WR, -0.98), col=SV, bevel=0.012))
    fl.append(tube('leg_o', [P(s * 0.15, 0.78, -0.94), P(s * 0.15, 0.62, -0.97)], 0.072, OR))
fl.append(box('caliper', (0.05, 0.16, 0.12), loc=P(0.21, 0.55, -0.85), col=SV, bevel=0.012))
fl.append(box('fender', (0.26, 0.62, 0.05), loc=P(0, 1.0, -1.0), rot=(0.4, 0, 0), col=WH, bevel=0.02, sub=1))
fl.append(box('fender_b', (0.2, 0.34, 0.04), loc=P(0, 0.9, -1.2), rot=(0.1, 0, 0), col=WH, bevel=0.015))
fork_lower = join(fl, 'fork_lower')
set_origin(fork_lower, P(0, 0.98, -0.88))
parent(front, fork_lower)

fu = []
for s in (-1, 1):
    fu.append(tube('stanchion', [P(s * 0.15, 1.46, -0.68), P(s * 0.15, 0.95, -0.9)], 0.045, SV))
fu.append(box('tclamp_t', (0.42, 0.08, 0.14), loc=P(0, 1.42, -0.7), rot=(0.3, 0, 0), col=OR, bevel=0.02, sub=1))
fu.append(box('tclamp_b', (0.4, 0.07, 0.12), loc=P(0, 1.2, -0.78), rot=(0.3, 0, 0), col=DK, bevel=0.02))
fu.append(tube('bars', [P(-0.44, 1.56, -0.56), P(-0.3, 1.56, -0.62), P(0.3, 1.56, -0.62), P(0.44, 1.56, -0.56)], 0.016, DK, seg=6))
fu.append(tube('bar_cross', [P(-0.28, 1.545, -0.62), P(0.28, 1.545, -0.62)], 0.012, DK, seg=6))
fu.append(box('bar_pad', (0.18, 0.1, 0.06), loc=P(0, 1.6, -0.62), col=OR, bevel=0.02))
for s in (-1, 1):
    fu.append(cyl('grip', 0.02, 0.02, 0.15, loc=P(s * 0.4, 1.56, -0.58), rot=(0, math.pi / 2, 0), col=0x0c0c0c, seg=8))
    fu.append(box('guard', (0.04, 0.2, 0.09), loc=P(s * 0.47, 1.59, -0.62), rot=(0.3, 0, s * 0.2), col=OR, bevel=0.012, sub=1))
    fu.append(tube('lever', [P(s * 0.3, 1.575, -0.58), P(s * 0.4, 1.59, -0.74)], 0.008, SV, seg=4))
fu.append(box('headshroud', (0.3, 0.3, 0.2), loc=P(0, 1.3, -0.82), rot=(0.4, 0, 0), col=OR, bevel=0.03, sub=1))
fork_upper = join(fu, 'fork_upper')
set_origin(fork_upper, head)
parent(fork_lower, fork_upper)

# front number plate (separate for texture)
pf = plane('plate_front', 0.34, 0.34, loc=P(0, 1.3, -0.935), rot=(-(math.pi / 2 - 0.4), 0, 0))
set_origin(pf, head)
parent(pf, fork_upper)

# ---------------------------------------------------------------- body
b = []
# frame
spar = [P(0.1, 1.38, -0.68), P(0.13, 1.28, -0.2), P(0.13, 1.1, 0.25), P(0.12, 0.82, 0.3)]
for s in (-1, 1):
    b.append(tube('spar', [(p[0] * s if i else p[0] * s, p[1], p[2]) for i, p in enumerate(spar)], 0.04, DK))
    b.append(tube('cradle', [P(s * 0.11, 1.0, -0.4), P(s * 0.12, 0.55, -0.35), P(s * 0.12, 0.4, 0.0), P(s * 0.12, 0.5, 0.35)], 0.032, DK))
    b.append(tube('sub', [P(s * 0.11, 1.26, 0.38), P(s * 0.1, 1.3, 0.8), P(s * 0.09, 1.34, 1.15)], 0.03, DK))
    b.append(tube('sub2', [P(s * 0.12, 0.85, 0.3), P(s * 0.1, 1.2, 0.8)], 0.025, DK))
b.append(tube('headtube', [P(0, 1.46, -0.66), P(0, 1.3, -0.72)], 0.06, DK))
# engine
b.append(box('cases', (0.34, 0.5, 0.34), loc=P(0, 0.6, 0.02), col=SV, bevel=0.03, sub=1))
b.append(box('gearbox', (0.28, 0.3, 0.3), loc=P(0, 0.68, 0.34), col=SV, bevel=0.03, sub=1))
b.append(cyl('barrel', 0.115, 0.115, 0.3, loc=P(0, 0.95, -0.22), rot=(-0.35, 0, 0), col=0x303034, seg=14, bevel=0.01))
for i in range(5):
    b.append(cyl('fin', 0.14, 0.14, 0.012, loc=P(0, 0.88 + i * 0.05, -0.2 - i * 0.015), rot=(-0.35, 0, 0), col=0x303034, seg=14))
b.append(cyl('head', 0.1, 0.09, 0.1, loc=P(0, 1.12, -0.28), rot=(-0.35, 0, 0), col=0x3a3a3f, seg=12, bevel=0.01))
b.append(cyl('clutchcov', 0.115, 0.115, 0.05, loc=P(0.19, 0.68, 0.3), rot=(0, math.pi / 2, 0), col=SV, seg=16, bevel=0.01))
b.append(cyl('ign', 0.09, 0.09, 0.045, loc=P(-0.19, 0.68, 0.18), rot=(0, math.pi / 2, 0), col=DK, seg=14))
b.append(cyl('carb', 0.055, 0.055, 0.2, loc=P(0, 1.02, 0.12), rot=(-0.7, 0, 0), col=SV, seg=10))
# radiators / shrouds / tank
for s in (-1, 1):
    b.append(box('rad', (0.07, 0.34, 0.3), loc=P(s * 0.2, 1.0, -0.5), rot=(0.25, 0, 0), col=0x6a6e74, bevel=0.01))
    b.append(box('shroud', (0.13, 0.46, 0.62), loc=P(s * 0.2, 1.14, -0.36), rot=(0.18, 0, s * -0.1), col=OR, bevel=0.035, sub=1))
    b.append(box('shroud_w', (0.02, 0.2, 0.2), loc=P(s * 0.268, 1.14, -0.4), rot=(0.18, 0, 0), col=WH, bevel=0.005))
    b.append(box('sidepanel', (0.04, 0.34, 0.5), loc=P(s * 0.17, 1.12, 0.46), rot=(-0.12, 0, 0), col=WH, bevel=0.025, sub=1))
    b.append(box('footpeg', (0.12, 0.03, 0.06), loc=P(s * 0.3, 0.55, 0.28), col=SV, bevel=0.008))
    b.append(tube('footpegarm', [P(s * 0.14, 0.58, 0.3), P(s * 0.3, 0.55, 0.28)], 0.012, SV, seg=4))
b.append(box('tank', (0.26, 0.26, 0.58), loc=P(0, 1.38, -0.3), rot=(0.18, 0, 0), col=OR, bevel=0.05, sub=1))
b.append(cyl('cap', 0.05, 0.05, 0.03, loc=P(0, 1.52, -0.28), col=SV, seg=10))
b.append(box('seat', (0.3, 0.12, 0.92), loc=P(0, 1.31, 0.52), rot=(0.04, 0, 0), col=0x0e0e0e, bevel=0.04, sub=1))
b.append(box('seatfront', (0.24, 0.1, 0.3), loc=P(0, 1.36, 0.0), rot=(0.1, 0, 0), col=0x0e0e0e, bevel=0.04, sub=1))
b.append(box('rfender', (0.24, 0.04, 0.62), loc=P(0, 1.4, 1.08), rot=(-0.3, 0, 0), col=OR, bevel=0.015, sub=1))
b.append(box('taillight', (0.1, 0.03, 0.04), loc=P(0, 1.32, 1.4), col=0xaa0000, bevel=0.005))
# shock
b.append(tube('shock', [P(0, 1.2, 0.46), P(0, 0.72, 0.3)], 0.032, SV, seg=8))
for i in range(9):
    t = i / 8
    pos = P(0, 1.1 - 0.35 * t, 0.43 - 0.12 * t)
    b.append(torus('coil', 0.052, 0.012, loc=pos, rot=(0.25, 0, 0), col=OR if i % 2 == 0 else 0xe34b00, seg=14, rseg=5))
b.append(cyl('shockres', 0.04, 0.04, 0.18, loc=P(0.09, 1.02, 0.4), rot=(0.3, 0, 0), col=SV, seg=8))
# exhaust (2 stroke chamber) right side
prof = [(0.025, 0.0), (0.04, 0.04), (0.085, 0.24), (0.125, 0.46), (0.135, 0.56), (0.1, 0.74), (0.045, 0.9), (0.045, 0.98), (0.07, 1.02), (0.07, 1.42), (0.0, 1.45)]
ex = lathe('pipe', prof, loc=P(0.26, 0.8, -0.32), rot=(math.pi / 2 - 0.2, 0, 0), col=SV, seg=14)
b.append(ex)
b.append(cyl('silcap', 0.072, 0.072, 0.03, loc=P(0.28, 1.2, 1.1), rot=(math.pi / 2 - 0.2, 0, 0), col=OR, seg=10))
b.append(tube('pipebr', [P(0.26, 1.0, 0.6), P(0.15, 1.2, 0.5)], 0.012, SV, seg=4))
# skid + brake pedal + kick
b.append(box('skid', (0.2, 0.05, 0.5), loc=P(0, 0.36, 0.0), col=SV, bevel=0.015))
b.append(tube('brakepedal', [P(0.28, 0.5, 0.45), P(0.3, 0.4, 0.6)], 0.01, SV, seg=4))
body = join(b, 'bike_body')
set_origin(body, (0, 0, 0))
# side number plates textured at runtime
psl = plane('plate_side_L', 0.3, 0.3, loc=P(-0.2, 1.12, 0.46), rot=(math.pi / 2, 0, -math.pi / 2))
psr = plane('plate_side_R', 0.3, 0.3, loc=P(0.2, 1.12, 0.46), rot=(math.pi / 2, 0, math.pi / 2))
prr = plane('plate_rear', 0.36, 0.34, loc=P(0, 1.42, 1.37), rot=(math.pi / 2 - 0.45, 0, 0))
for p in (psl, psr, prr):
    set_origin(p, (0, 0, 0))
    parent(p, body)
parent(swingarm, body)
parent(fork_upper, body)
body.name = 'bike_body'

bpy.ops.object.select_all(action='SELECT')
export(os.path.join(HERE, 'bike_raw.glb'))
print('bike done')
