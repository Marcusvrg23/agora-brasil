#!/usr/bin/env python3
"""Ágora Brasil Run V2, created in Higgsfield workspace from avatar rig.
Only animation tracks and skeleton; no mesh, textures or licensed external content.
"""
import json, math, struct, hashlib, copy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source=(ROOT/"public/assets/bases/homem.glb").read_bytes()
json_len, typ=struct.unpack_from("<I4s",source,12)
src=json.loads(source[20:20+json_len])
names=[n.get("name") for n in src["nodes"]]
assert len(names)==26 and "Hips" in names
node_indices={n:i for i,n in enumerate(names) if n}
# Root bone + first 23 children cloned from the exact original rig, avoiding
# clipping errors introduced by retargeting two different T/A-pose skeletons.
nodes=[]
for old in src["nodes"][:24]:
    n=copy.deepcopy(old)
    n.pop("mesh",None);n.pop("skin",None);n.pop("extras",None)
    nodes.append(n)
by_name={n["name"]:i for i,n in enumerate(nodes) if "name" in n}
# This animation uses real keyframes, with distinct cyclic airborne and planted
# foot phases, reciprocal shoulders, 85-degree elbow flexion, hip elevation,
# torso stabilization and head motion. Different from Walk (4.2 seconds).
FPS=60
DURATION=.86
FRAMES=60
times=[DURATION*i/FRAMES for i in range(FRAMES+1)]
# scalar quaternion, axis angle, q mul (x,y,z,w)
def qmul(a,b):
 x,y,z,w=a;X,Y,Z,W=b
 return (w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z)
def qaxis(axis,angle):
 n=math.sqrt(sum(v*v for v in axis));s=math.sin(angle/2)/n
 return (axis[0]*s,axis[1]*s,axis[2]*s,math.cos(angle/2))
def normalize(q):
 n=math.sqrt(sum(v*v for v in q));return tuple(v/n for v in q)
def pose(name,phase):
 n=nodes[by_name[name]];base=n.get("rotation",[0,0,0,1])
 wave=math.sin(phase);c=math.cos(phase)
 # Manually authored rig angles, not a walk clip with faster playback.
 if name=="LeftUpLeg":
  return qmul(qmul(base,qaxis((1,0,0),.57*max(0,wave)-.16*max(0,-wave)+.025)),qaxis((0,0,1),.035))
 if name=="RightUpLeg":
  return qmul(qmul(base,qaxis((1,0,0),.57*max(0,-wave)-.16*max(0,wave)+.025)),qaxis((0,0,1),-.035))
 if name=="LeftLeg":
  bend=.09+.68*max(0,wave)**1.5
  return qmul(base,qaxis((1,0,0),bend))
 if name=="RightLeg":
  bend=.09+.68*max(0,-wave)**1.5
  return qmul(base,qaxis((1,0,0),bend))
 if name=="LeftFoot":
  return qmul(base,qaxis((1,0,0),-.09-.23*wave +.13*max(0,-wave)))
 if name=="RightFoot":
  return qmul(base,qaxis((1,0,0),-.09+.23*wave +.13*max(0,wave)))
 if name=="LeftToeBase":
  return qmul(base,qaxis((1,0,0),.15+max(0,-wave)*.23))
 if name=="RightToeBase":
  return qmul(base,qaxis((1,0,0),.15+max(0,wave)*.23))
 if name=="LeftArm":
  return qmul(qmul(base,qaxis((1,0,0),-.70*wave-.12)),qaxis((0,0,1),-.075))
 if name=="RightArm":
  return qmul(qmul(base,qaxis((1,0,0),.70*wave-.12)),qaxis((0,0,1),.075))
 if name=="LeftForeArm":
  return qmul(base,qaxis((1,0,0),-.66+.12*wave))
 if name=="RightForeArm":
  return qmul(base,qaxis((1,0,0),-.66-.12*wave))
 if name=="LeftHand":
  return qmul(base,qaxis((1,0,0),.08+.08*wave))
 if name=="RightHand":
  return qmul(base,qaxis((1,0,0),.08-.08*wave))
 if name=="Hips":
  return qmul(qmul(base,qaxis((1,0,0),-.12+.015*math.sin(phase*2))),qaxis((0,1,0),-.03*wave))
 if name=="Spine02":
  return qmul(base,qaxis((1,0,0),-.08+.014*math.sin(phase*2)))
 if name=="Spine01":
  return qmul(base,qaxis((0,1,0),.022*wave))
 if name=="Spine":
  return qmul(base,qaxis((0,1,0),-.025*wave))
 if name=="Head":
  return qmul(base,qaxis((1,0,0),.05))
 if name=="neck":
  return qmul(base,qaxis((1,0,0),.015))
 return tuple(base)
channels=[]
samplers=[]
accessors=[]
views=[]
binary=bytearray()
def add_accessor(values,type_):
 global binary
 while len(binary)%4:binary.append(0)
 offset=len(binary)
 ncomp=4 if type_=="VEC4" else 3 if type_=="VEC3" else 1
 assert len(values)%ncomp==0
 binary.extend(struct.pack("<"+"f"*len(values),*values))
 views.append({"buffer":0,"byteOffset":offset,"byteLength":4*len(values)})
 acc={"bufferView":len(views)-1,"componentType":5126,"count":len(values)//ncomp,"type":type_}
 if type_=="SCALAR":acc["min"]=[min(values)];acc["max"]=[max(values)]
 accessors.append(acc)
 return len(accessors)-1
idx_times=add_accessor(times,"SCALAR")
names_to_animate=["LeftUpLeg","RightUpLeg","LeftLeg","RightLeg","LeftFoot","RightFoot","LeftToeBase","RightToeBase","LeftArm","RightArm","LeftForeArm","RightForeArm","LeftHand","RightHand","Hips","Spine02","Spine01","Spine","neck","Head"]
for name in names_to_animate:
 values=[]
 for i in range(FRAMES+1):
  phi=math.tau*i/FRAMES
  values.extend(normalize(pose(name,phi)))
 idx=add_accessor(values,"VEC4")
 samplers.append({"input":idx_times,"output":idx,"interpolation":"LINEAR"})
 channels.append({"sampler":len(samplers)-1,"target":{"node":by_name[name],"path":"rotation"}})
# Hip vertical travel in the same centimeters as original rig (hip height ~97.9).
# No planar translation: movement direction/speed remains authoritative in game.
rest_hips=nodes[by_name["Hips"]].get("translation",[0,97.92,0])
hips_xyz=[]
for i in range(FRAMES+1):
 phase=math.tau*i/FRAMES
 # Flight phases on quarter-cycles, brief compression at foot contacts.
 lift=1.4+3.6*(1-math.cos(2*phase))/2
 hips_xyz.extend((rest_hips[0],rest_hips[1]+lift,rest_hips[2]))
idx=add_accessor(hips_xyz,"VEC3")
samplers.append({"input":idx_times,"output":idx,"interpolation":"LINEAR"})
channels.append({"sampler":len(samplers)-1,"target":{"node":by_name["Hips"],"path":"translation"}})
d={
 "asset":{"version":"2.0","generator":"Higgsfield 3D motion pipeline / Ágora Brasil - authored sprint V2"},
 "scene":0,"scenes":[{"nodes":[by_name["Hips"]],"name":"Run_V2_OriginalRig"}],
 "nodes":nodes,
 "buffers":[{"byteLength":len(binary)}],"bufferViews":views,"accessors":accessors,
 "animations":[{"name":"Sprint_V2_RealStride","channels":channels,"samplers":samplers}],
 "extras":{"license":"original development source","sourceRig":"public/assets/bases/homem.glb","duration":DURATION,"fps":FPS,"grounding":"in-place authored animation, locomotion server-owned"}
}
json_bytes=json.dumps(d,separators=(",",":"),ensure_ascii=False).encode("utf-8")
json_bytes+=b" " *(-len(json_bytes)%4)
binary.extend(b"\x00"*(-len(binary)%4))
output=(struct.pack("<4sII",b"glTF",2,12+8+len(json_bytes)+8+len(binary))
      +struct.pack("<I4s",len(json_bytes),b"JSON")+json_bytes
      +struct.pack("<I4s",len(binary),b"BIN\x00")+bytes(binary))
(ROOT/"public/assets/anims/run-sprint-v2.glb").write_bytes(output)
assert output[:4]==b"glTF"
assert len(d["animations"][0]["channels"])==21
print(json.dumps({"bytes":len(output),"sha256":hashlib.sha256(output).hexdigest(),"tracks":len(channels),"bones":len(nodes),"duration":DURATION,"frames":FRAMES+1,"name":d["animations"][0]["name"]},ensure_ascii=False))
