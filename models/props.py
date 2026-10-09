import sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
reset()
OR=0xff5a00; BK=0x141414; WH=0xf2f2f2; SV=0xb4b8be; DK=0x2b2b2e; LM=0xc8ff00
out=[]
def put(o, name, x=0, y=0):
    o.name = name; o.location = (x, y, 0); select_only(o); bpy.ops.object.transform_apply(location=True); out.append(o); return o
def J(parts, name): return join(parts, name)

# rocks
for i,(r,seed,c) in enumerate([(0.9,1,0x8a7a68),(0.7,7,0x7d6f60),(1.1,13,0x9a8a74)]):
    o = noise_rock('x', r, seed, c, flat=True, detail=2, squash=0.75, jit=0.2)
    put(o, 'rock_'+'abc'[i])
# acacia tree
tr=[tube('t', [(0,0,0),(0.1,0,1.6),(-0.1,0.1,2.8)], 0.16, 0x4a3524, seg=8),
    tube('t', [(-0.1,0.1,2.4),(-0.9,0.2,3.3)], 0.08, 0x4a3524, seg=6),
    tube('t', [(0,0,2.2),(1.0,-0.2,3.1)], 0.08, 0x4a3524, seg=6)]
for (x,y,z,s) in [(0,0,3.5,1.9),(-1.2,0.3,3.5,1.3),(1.2,-0.2,3.3,1.4)]:
    tr.append(sphere('c', 1.0, loc=(x,y,z), scale=(s,s*0.9,0.38), col=0x5a7a2a, seg=10, rings=6, jitter=0.12))
put(J(tr,'x'),'tree')
# aloe
al=[]
for i in range(9):
    a=i/9*math.tau
    al.append(cyl('l',0.09,0.0,0.9,loc=(math.cos(a)*0.28,math.sin(a)*0.28,0.4),rot=(math.sin(a)*0.7,-math.cos(a)*0.7,0),col=0x6f8f4a if i%2 else 0x587a3a,seg=5,cap=False))
put(J(al,'x'),'aloe')
# bush
bs=[sphere('b',0.5,loc=(x,y,0.3),scale=(1,1,0.7),col=0x7a8a3a,seg=8,rings=5,jitter=0.15) for x,y in [(0,0),(0.4,0.2),(-0.3,0.3)]]
put(J(bs,'x'),'bush')
# tyre (white, tinted at runtime)
put(torus('x',0.42,0.16,loc=(0,0,0.16),rot=(0,0,0),col=0xffffff,seg=18,rseg=8),'tyre')
# hay bale
put(cyl('x',0.55,0.55,0.9,loc=(0,0,0.55),rot=(0,math.pi/2,0),col=0xd9b95a,seg=14,bevel=0.02),'hay')
# barrel
bp=[cyl('b',0.3,0.3,0.9,loc=(0,0,0.45),col=0xd2262a,seg=14,bevel=0.01)]
for z in (0.2,0.45,0.7): bp.append(cyl('r',0.31,0.31,0.05,loc=(0,0,z),col=0x8a1519,seg=14))
put(J(bp,'x'),'barrel')
# cone
cn=[cyl('c',0.3,0.3,0.04,loc=(0,0,0.02),col=BK,seg=4,bevel=0.01),cyl('c',0.2,0.04,0.68,loc=(0,0,0.38),col=0xff6a00,seg=10),cyl('c',0.14,0.1,0.14,loc=(0,0,0.34),col=WH,seg=10)]
put(J(cn,'x'),'cone')
# mine
mn=[cyl('m',0.36,0.36,0.1,loc=(0,0,0.05),col=0x4b5230,seg=16,bevel=0.015),cyl('m',0.28,0.22,0.06,loc=(0,0,0.12),col=0x3c4226,seg=16),
    cyl('m',0.09,0.09,0.05,loc=(0,0,0.17),col=0x222222,seg=8)]
for i in range(3):
    a=i/3*math.tau
    mn.append(box('s',(0.06,0.1,0.03),loc=(math.cos(a)*0.27,math.sin(a)*0.27,0.1),rot=(0,0,a),col=0xcdc300,native=True,bevel=0.005))
put(J(mn,'x'),'mine')
put(sphere('l',0.055,loc=(0,0,0.21),col=0xff2020,seg=8,rings=6),'mine_led')
# crate
put(box('x',(0.8,0.8,0.8),loc=(0,0,0.4),col=0xa8793a,bevel=0.03,native=True,jitter=0.08),'crate')
# cycleworx shed
sh=[box('w',(4.4,3.0,2.4),loc=(0,0,1.2),col=0x2b2f36,bevel=0.03,native=True),
    box('r',(4.9,3.5,0.18),loc=(0,0,2.5),rot=(0.12,0,0),col=0x1c1f24,bevel=0.03,native=True),
    box('d',(2.2,0.08,1.9),loc=(0,1.53,0.95),col=0x111418,bevel=0.02,native=True),
    box('s',(3.4,0.12,0.7),loc=(0,1.56,2.15),col=LM,bevel=0.02,native=True),
    box('b',(0.2,0.3,0.2),loc=(-1.4,1.7,0.1),col=OR,bevel=0.02,native=True)]
put(J(sh,'x'),'shed')
# fork stand
fs=[box('b',(2.0,0.5,0.1),loc=(0,0,0.05),col=DK,native=True,bevel=0.01),box('p',(0.12,0.12,1.4),loc=(-0.9,0,0.7),col=DK,native=True),box('p',(0.12,0.12,1.4),loc=(0.9,0,0.7),col=DK,native=True),
    box('t',(2.0,0.1,0.1),loc=(0,0,1.4),col=DK,native=True)]
for x in (-0.4,0.4):
    fs.append(cyl('f',0.045,0.045,1.2,loc=(x,0,0.85),col=SV,seg=8))
    fs.append(cyl('f',0.06,0.06,0.6,loc=(x,0,0.55),col=OR,seg=8))
put(J(fs,'x'),'forkstand')
# can
cb=[cyl('c',0.5,0.5,1.8,loc=(0,0,1.0),col=0x101010,seg=20,bevel=0.01),cyl('c',0.5,0.44,0.1,loc=(0,0,1.95),col=SV,seg=20),cyl('c',0.5,0.52,0.1,loc=(0,0,0.08),col=SV,seg=20),
    cyl('c',0.515,0.515,0.5,loc=(0,0,1.0),col=LM,seg=20)]
put(J(cb,'x'),'can')
# lamp pole
lp=[cyl('p',0.07,0.1,3.8,loc=(0,0,1.9),col=DK,seg=8),box('h',(0.9,0.4,0.2),loc=(0,0,3.85),col=SV,native=True,bevel=0.03)]
put(J(lp,'x'),'lamp')
# flag pole
put(J([cyl('p',0.04,0.05,4.0,loc=(0,0,2.0),col=SV,seg=6)],'x'),'pole')
# tent
tn=[cyl('t',2.0,0.1,2.0,loc=(0,0,1.0),col=0xc8ff00,seg=4,cap=True),]
put(J(tn,'x'),'tent')
# podium
pd=[box('a',(1.4,1.4,0.9),loc=(0,0,0.45),col=WH,native=True,bevel=0.03)]
put(J(pd,'x'),'podium')
# signpost
sp=[cyl('p',0.08,0.08,2.6,loc=(0,0,1.3),col=DK,seg=8),box('b',(2.4,0.1,1.0),loc=(0,0,2.5),col=0x16181c,native=True,bevel=0.03)]
put(J(sp,'x'),'signpost')
for o in out: o.select_set(True)
bpy.ops.object.select_all(action='DESELECT')
for o in out: o.select_set(True)
export(os.path.join(HERE, 'props_raw.glb'), out)
print('props ok', len(out))
