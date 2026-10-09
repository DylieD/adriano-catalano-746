import sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib import *
reset()
OR=0xff5a00; BK=0x141414; WH=0xf2f2f2; SV=0xb4b8be; DK=0x2b2b2e; LM=0xc8ff00
def P(x,y3,z3): return (x,-z3,y3)
hip=P(0,1.42,0.34); sho=P(0,2.12,-0.1); neck=P(0,2.3,-0.12)
# torso
t=[tube('t',[P(0,1.5,0.3),P(0,1.9,0.0),P(0,2.15,-0.1)],0.2,WH,seg=12),
   sphere('s',0.2,loc=P(0,1.5,0.32),scale=(1.1,1.0,1.0),col=BK,seg=10,rings=6),
   box('chest',(0.46,0.18,0.28),loc=P(0,2.05,-0.12),rot=(0.5,0,0),col=OR,bevel=0.04,sub=1),
   cyl('neck',0.08,0.09,0.1,loc=P(0,2.3,-0.12),col=0xd8a07a,seg=8)]
torso=join(t,'torso'); set_origin(torso,hip)
back=plane('jersey_back',0.4,0.4,loc=P(0,1.98,0.1),rot=(math.pi/2-0.9,0,0))
set_origin(back,hip)
# head
h=[sphere('h',0.19,loc=P(0,2.58,-0.16),scale=(1.0,1.1,1.15),col=WH,seg=14,rings=10),
   box('chin',(0.2,0.12,0.14),loc=P(0,2.45,-0.3),col=BK,bevel=0.03,sub=1),
   box('gog',(0.36,0.13,0.1),loc=P(0,2.6,-0.34),col=LM,bevel=0.03,sub=1),
   box('lens',(0.3,0.09,0.04),loc=P(0,2.6,-0.395),col=0x101820,bevel=0.01),
   box('peak',(0.3,0.03,0.3),loc=P(0,2.8,-0.42),rot=(0.25,0,0),col=OR,bevel=0.01),
   box('stripe',(0.07,0.02,0.55),loc=P(0,2.78,-0.12),col=OR,bevel=0.005,rot=(0.1,0,0))]
head=join(h,'head'); set_origin(head,neck)
def arm(s,name):
    sh=P(s*0.26,2.12,-0.1); el=P(s*0.4,1.95,-0.32); ha=P(s*0.44,1.6,-0.6)
    a=[tube('u',[sh,el],0.085,WH),tube('f',[el,ha],0.07,OR),sphere('g',0.085,loc=ha,col=BK,seg=8,rings=6)]
    o=join(a,name); set_origin(o,sh); return o
aL=arm(-1,'arm_L'); aR=arm(1,'arm_R')
def leg(s,name):
    hp=P(s*0.16,1.42,0.34); kn=P(s*0.34,1.12,-0.1); an=P(s*0.3,0.62,0.22)
    a=[tube('th',[hp,kn],0.13,BK),tube('sh',[kn,an],0.1,BK),box('kp',(0.12,0.2,0.16),loc=P(s*0.36,1.14,-0.14),rot=(0.2,0,0),col=WH,bevel=0.03,sub=1),
       box('boot',(0.17,0.16,0.4),loc=P(s*0.3,0.58,0.16),col=WH,bevel=0.03,sub=1),box('bs',(0.18,0.06,0.18),loc=P(s*0.3,0.78,0.22),col=OR,bevel=0.01)]
    o=join(a,name); set_origin(o,hp); return o
lL=leg(-1,'leg_L'); lR=leg(1,'leg_R')
for c in (head,aL,aR,back): parent(c,torso)
bpy.ops.object.select_all(action='SELECT')
export(os.path.join(HERE, 'rider_raw.glb'))
print('ok')
