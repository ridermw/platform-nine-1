"""Author the reference's hero meshes in Blender, then export portable GLBs.

Run through Blender MCP with build(ROOT). Input coordinates are Three.js metres:
X across the platform, Y up, Z down the track. No reference-image projection.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

PI = math.pi
TAU = 2 * PI


def coord(v):
    return (v[0], -v[2], v[1])


class Sculpt:
    def __init__(self):
        self.parts = {}

    def mesh(self, material, vertices, faces, uv=None):
        data = self.parts.setdefault(material, [[], [], []])
        offset = len(data[0])
        data[0].extend(coord(v) for v in vertices)
        data[1].extend(tuple(offset + i for i in face) for face in faces)
        data[2].extend(uv or [(v[0] * .7 + v[2] * .19, v[1] * .7 + v[2] * .43) for v in vertices])

    def box(self, m, p, size):
        x, y, z = p
        a, b, c = [v / 2 for v in size]
        vs = [(x + i*a, y+j*b, z+k*c) for i,j,k in
              [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        fs = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        self.mesh(m, vs, fs)

    def tube(self, m, points, radius, sides=10):
        pts = [Vector(p) for p in points]
        vertices, uv, faces = [], [], []
        length = 0
        stride = sides + 1
        for i, p in enumerate(pts):
            tangent = (pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
            axis = Vector((0,1,0)) if abs(tangent.y) < .92 else Vector((1,0,0))
            a = tangent.cross(axis).normalized()
            b = tangent.cross(a).normalized()
            if i:
                length += (p-pts[i-1]).length
            r = radius[i] if isinstance(radius,list) else radius
            for j in range(stride):
                v = p + r * (a*math.cos(TAU*j/sides)+b*math.sin(TAU*j/sides))
                vertices.append(tuple(v))
                uv.append((j/sides, length))
            if i:
                for j in range(sides):
                    faces.append(((i-1)*stride+j,(i-1)*stride+j+1,i*stride+j+1,i*stride+j))
        for end in [0, len(pts)-1]:
            start = len(vertices)
            vertices.extend(vertices[end*stride:end*stride+sides])
            uv.extend((.5+.5*math.cos(TAU*j/sides),.5+.5*math.sin(TAU*j/sides)) for j in range(sides))
            cap = tuple(start+j for j in range(sides))
            faces.append(tuple(reversed(cap)) if end == 0 else cap)
        self.mesh(m,vertices,faces,uv)

    def cylinder(self, m, a, b, radius, sides=32):
        self.tube(m,[a,b],radius,sides)

    def ring(self, m, center, radius, tube=.02, axis="z", segments=64, sides=8, start=0, end=TAU):
        x,y,z=center
        pts=[]
        for i in range(segments+1):
            t=start+(end-start)*i/segments
            a,b=radius*math.cos(t),radius*math.sin(t)
            pts.append((x+a,y+b,z) if axis=="z" else ((x,y+a,z+b) if axis=="x" else (x+a,y,z+b)))
        self.tube(m,pts,tube,sides)

    def bolt(self, m, p, axis="z", radius=.023):
        d={"x":(radius*.9,0,0),"y":(0,radius*.9,0),"z":(0,0,radius*.9)}[axis]
        self.cylinder(m, p, tuple(p[i]+d[i] for i in range(3)),radius,6)

    def ball(self,m,p,r,sides=12,rings=8):
        vertices,faces,uv=[],[],[]
        for i in range(rings+1):
            lat=PI*i/rings
            for j in range(sides):
                lon=TAU*j/sides
                vertices.append((p[0]+r*math.sin(lat)*math.cos(lon),p[1]+r*math.cos(lat),p[2]+r*math.sin(lat)*math.sin(lon)))
                uv.append((j/sides,i/rings))
                if i:
                    faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
        self.mesh(m,vertices,faces,uv)

    def wheel(self,x,y,z,r):
        self.ring("steel",(x,y,z),r,.065,"x",64)
        self.ring("scarlet",(x,y,z),r-.08,.04,"x",64)
        self.cylinder("steel",(x-.09,y,z),(x+.09,y,z),.17,32)
        for i in range(18):
            a=TAU*i/18
            self.cylinder("scarlet",(x,y+.15*math.cos(a),z+.15*math.sin(a)),
                          (x,y+(r-.06)*math.cos(a),z+(r-.06)*math.sin(a)),.036,8)
        self.bolt("brass",(x+.10,y,z),"x",.065)

    def export(self, root, name, materials):
        scene=bpy.data.scenes.new("PlatformNine_"+name)
        bpy.context.window.scene=scene
        for material,(vertices,faces,uv) in self.parts.items():
            mesh=bpy.data.meshes.new(name+"_"+material)
            mesh.from_pydata(vertices,[],faces)
            mesh.update()
            layer=mesh.uv_layers.new(name="UVMap")
            for face in mesh.polygons:
                face.use_smooth=len(face.vertices)==4
                for li in face.loop_indices:
                    layer.data[li].uv=uv[mesh.loops[li].vertex_index]
            obj=bpy.data.objects.new(name+"_"+material,mesh)
            scene.collection.objects.link(obj)
            obj.data.materials.append(materials[material])
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(root/"public"/"models"/(name+".glb")),
                                  export_format="GLB",use_selection=True,export_yup=True,
                                  use_active_scene=True,export_animations=False,export_materials="EXPORT")
        return scene


def locomotive():
    s=Sculpt()
    s.box("black",(0,1.42,4.5),(1.55,.5,8.8))
    s.box("scarlet",(0,1.73,4.5),(2.9,.17,9.0))
    s.box("scarlet",(0,1.18,-.18),(2.9,.64,.22))
    s.box("black",(0,1.66,-.03),(2.9,.40,.24))
    for x in [-1.13,1.13]:
        s.cylinder("scarlet",(x,1.18,-.2),(x,1.18,-.58),.24)
        s.cylinder("steel",(x,1.18,-.60),(x,1.18,-.70),.32,64)
        s.ring("black",(x,1.18,-.58),.22,.02)
        for k in range(6):
            a=k*TAU/6
            s.bolt("steel",(x+.22*math.cos(a),1.18+.22*math.sin(a),-.31),radius=.035)
    for i in range(22):
        for y in [.94,1.45,1.65]:
            s.bolt("black",(-1.36+i*.13,y,-.31))
    s.cylinder("black",(0,2.94,.50),(0,2.94,2.65),1.04,96)
    s.cylinder("scarlet",(0,2.94,2.65),(0,2.94,8.1),1.02,96)
    s.cylinder("black",(0,2.94,.35),(0,2.94,.53),1.025,96)
    s.ring("steel",(0,2.94,.32),1.015,.041,"z",96)
    s.ring("black",(0,2.94,.29),.946,.014,"z",96)
    for i in range(40):
        a=TAU*i/40
        s.bolt("steel",(.973*math.cos(a),2.94+.973*math.sin(a),.285),radius=.018)
    for z in [2.72,3.9,5.15,6.45,7.75]:
        s.ring("black",(0,2.94,z),1.024,.027,"z",96)
        s.ring("brass",(0,2.94,z+.035),1.027,.012,"z",96)
    for y in [2.58,3.34]:
        s.box("black",(.40,y,.23),(.97,.06,.06))
        for x in [.05,.65,.82]:
            s.bolt("steel",(x,y,.18),radius=.023)
    s.cylinder("brass",(0,2.94,.21),(0,2.94,.05),.105)
    s.tube("brass",[(-.34,2.94,.015),(0,2.94,.015),(0,2.62,.015)],.029)
    # A flared chimney, not a capped toy cylinder.
    for y,r1,r2,h in [(3.93,.29,.30,.16),(4.09,.30,.245,.47),(4.56,.245,.34,.08)]:
        s.tube("black",[(0,y,1.20),(0,y+h,1.20)],[r1,r2],64)
    s.ring("steel",(0,4.64,1.2),.34,.025,"y")
    s.cylinder("soot",(0,4.59,1.2),(0,4.595,1.2),.29,48)
    s.cylinder("scarlet",(0,3.90,4.2),(0,4.16,4.2),.37)
    s.cylinder("brass",(0,4.07,4.2),(0,4.48,4.2),.235,48)
    s.ring("brass",(0,4.45,4.2),.25,.034,"y")
    s.ring("brass",(0,4.09,4.2),.28,.032,"y")
    for side in [-1,1]:
        x=side*1.05
        s.tube("brass",[(x,3.30,1.1),(x,3.50,1.3),(x,3.50,7.95)],.021)
        for z in [1.4,2.7,4.1,5.4,6.7,7.85]:
            s.cylinder("brass",(side*.94,3.5,z),(side*1.10,3.5,z),.025)
        s.tube("black",[(side*.65,2.23,1.12),(side*.91,1.83,1.9),(side*1.08,1.1,2.25)],.115,20)
        s.ring("steel",(side*.64,2.23,1.12),.12,.016,"y",24)
        for z in [2.8,4.95,7.0]:
            s.wheel(side*.94,1.04,z,.90)
            s.ring("scarlet",(side*1.10,1.04,z),1.00,.075,"x",48,8,.20,PI-.20)
        for z in [.85,8.55]:
            s.wheel(side*.83,.69,z,.54)
        # Side rods, eccentrics and valve gear.
        rx=side*1.105
        s.tube("steel",[(rx,.87,1.65),(rx,.87,7.40)],.050,8)
        s.tube("steel",[(rx,1.16,2.72),(rx,1.43,5.0),(rx,1.16,7.08)],.045,8)
        s.tube("steel",[(rx,1.42,2.00),(rx,.86,4.95)],.045,8)
        for z in [2.8,4.95,7.0]:
            s.cylinder("steel",(rx-side*.04,.86,z),(rx+side*.08,.86,z),.145,32)
            s.bolt("brass",(rx+side*.10,.86,z),"x",.06)
        s.box("scarlet",(side*.98,1.1,1.5),(.54,.58,.75))
        s.cylinder("black",(side*1.05,1.12,1.1),(side*1.05,1.12,2.0),.24)
        for j in range(3):
            s.box("black",(side*1.22,.8+j*.25,8.6),(.38,.045,.55))
        for j in range(60):
            s.bolt("steel",(side*1.46,1.72,.15+j*.145),"x",.017)
    # Cab: solid lower panels, real openings, fine brass window frames.
    s.box("scarlet",(0,2.0,8.75),(2.65,.58,1.60))
    for side in [-1,1]:
        x=side*1.30
        for z in [8.01,9.49]:
            s.box("scarlet",(x,3.04,z),(.10,1.80,.13))
        s.box("scarlet",(x,2.48,8.75),(.10,.55,1.60))
        s.box("scarlet",(x,3.79,8.75),(.10,.22,1.60))
        for z in [8.13,9.1]:
            s.box("brass",(x+side*.07,3.2,z),(.025,.86,.025))
        for y in [2.78,3.64]:
            s.box("brass",(x+side*.07,y,8.62),(.025,.026,1.0))
        s.box("glass",(x,3.21,8.62),(.014,.79,.92))
        for y in [2.05,2.36]:
            s.box("brass",(x+side*.06,y,8.73),(.022,.014,1.32))
    for z in [8.0,9.50]:
        s.box("scarlet",(0,2.39,z),(2.60,1.0,.10))
        for x in [-1.2,0,1.2]:
            s.box("scarlet",(x,3.24,z),(.10,.78,.1))
    # Rolled arched roof sheet.
    vertices=[]
    for z in [7.83,9.68]:
        for i in range(33):
            x=-1.52+3.04*i/32
            vertices.append((x,3.84+.28*(1-(x/1.52)**2),z))
    s.mesh("black",vertices,[(i,i+1,34+i,33+i) for i in range(32)])
    for z in [7.83,9.68]:
        s.tube("steel",[(x,3.84+.28*(1-(x/1.52)**2),z) for x in [-1.52+i*.095 for i in range(33)]],.024)
    # Coupling hook and flexible brake hoses.
    s.box("black",(0,1.1,-.55),(.20,.25,.2))
    for x in [-.40,.24]:
        s.tube("soot",[(x,1.2,-.37),(x+.1,.85,-.65),(x,.32,-.50),(x-.1,.26,-.3)],.056)
        for j in range(12):
            s.ring("black",(x+.03,.40+j*.035,-.50),.060,.009,"y",16,6)
    for j in range(4):
        s.ring("steel",(0,.40+j*.13,-.65),.09,.019,"z",20)
    s.box("brass",(0,4.02,.40),(.17,.23,.12))
    s.cylinder("enamel",(0,4.03,.30),(0,4.03,.29),.057,24)
    return s


def trunk(s, pos, size):
    x,y,z=pos; w,h,d=size
    s.box("leather",pos,size)
    for xx in [x-w*.34,x+w*.34]:
        for zz in [z-d*.505,z+d*.505]:
            s.box("leather",(xx,y,zz),(.055,h,.022))
        s.box("leather",(xx,y+h*.505,z),(.055,.024,d))
    for xx in [x-w*.49,x+w*.49]:
        for zz in [z-d*.50,z+d*.50]:
            s.box("brass",(xx,y,zz),(.035,h,.035))
    for yy in [y-h*.47,y+h*.47]:
        for zz in [z-d*.505,z+d*.505]:
            s.box("brass",(x,yy,zz),(w,.014,.015))
    for xx in [x-w*.25,x+w*.25]:
        s.box("brass",(xx,y+h*.25,z-d*.525),(.10,.14,.025))
        s.bolt("black",(xx,y+h*.25,z-d*.54),radius=.018)
    s.tube("black",[(x-.12,y+.01,z-d*.54),(x-.09,y+.07,z-d*.59),(x+.09,y+.07,z-d*.59),(x+.12,y+.01,z-d*.54)],.022)
    for i in range(9):
        for xx in [x-w*.48,x+w*.48]:
            s.bolt("brass",(xx,y-h*.4+i*h*.1,z-d*.525),radius=.009)


def trolley():
    s=Sculpt()
    s.box("wood",(0,.30,0),(1.32,.10,.86))
    for x in [-.64,.64]:
        s.cylinder("brass",(x,.35,-.43),(x,.35,.43),.04)
        for z in [-.34,.34]:
            s.wheel(x,.16,z,.15)
    for z in [-.43,.43]:
        s.cylinder("brass",(-.64,.35,z),(.64,.35,z),.04)
    s.tube("brass",[(-.57,.35,.38),(-.57,1.87,.38),(-.53,2.02,.38),(-.4,2.12,.38),(.4,2.12,.38),(.53,2.02,.38),(.57,1.87,.38),(.57,.35,.38)],.029,12)
    for y in [.78,1.22]:
        s.cylinder("brass",(-.57,y,.38),(.57,y,.38),.022)
    trunk(s,(0,.74,0),(1.15,.75,.73))
    trunk(s,(-.16,1.22,.10),(.87,.24,.54))
    trunk(s,(.02,.44,.02),(1.05,.18,.63))
    # Bird cage: individual wires with a smoothly domed top.
    cx,cy,cz=-.29,1.37,.12
    r=.30
    s.cylinder("brass",(cx,cy,cz),(cx,cy+.045,cz),r,64)
    for i in range(40):
        a=TAU*i/40
        pts=[(cx+r*math.cos(a),cy,cz+r*math.sin(a)),(cx+r*math.cos(a),cy+.40,cz+r*math.sin(a))]
        for j in range(1,13):
            t=j*PI/24
            pts.append((cx+r*math.cos(t)*math.cos(a),cy+.40+r*math.sin(t),cz+r*math.cos(t)*math.sin(a)))
        s.tube("brass",pts,.006,6)
    for h in [.07,.21,.37,.42]:
        s.ring("brass",(cx,cy+h,cz),r,.011,"y",64,6)
    s.ring("brass",(cx,cy+.75,cz),.04,.010,"z",24,6)
    s.cylinder("wood",(cx-r*.8,cy+.13,cz),(cx+r*.8,cy+.13,cz),.016)
    # Continuous cloth shell with folds and draped tassels, not stacked boxes.
    vs=[]; fs=[]; uv=[]; nx=40; nz=48
    for j in range(nz+1):
        t=j/nz
        z=.32-.84*t
        y=1.42 if t<.63 else 1.42-(t-.63)*1.4
        for i in range(nx+1):
            u=i/nx; x=.03+u*.58
            vs.append((x,y+.024*math.sin(u*TAU*5+t*4)+.014*math.sin(t*TAU*6),z))
            uv.append((u*2,t*3))
            if i and j:
                n=j*(nx+1)+i
                fs.append((n,n-1,n-nx-2,n-nx-1))
    s.mesh("cloth",vs,fs,uv)
    for k in range(42):
        x=.03+k*.58/41
        s.tube("cloth",[(x,.91,-.52),(x+.006,.84,-.53),(x-.004,.77,-.52)],.004,5)
    return s


def bench():
    s=Sculpt()
    for z in [-.25,-.125,0,.125,.25]:
        s.box("wood",(0,.52,z),(1.8,.055,.105))
    for y in [.68,.81,.94,1.07]:
        s.box("wood",(0,y,.30),(1.8,.10,.055))
    for x in [-.73,.73]:
        for z in [-.24,.24]:
            s.tube("black",[(x,.06,z+.10),(x,.4,z),(x,.55,z)],.045)
        s.tube("black",[(x,.50,-.27),(x,.73,-.27),(x,.78,-.17),(x,.75,.29),(x,1.11,.31)],.03)
        for y in [.68,.81,.94,1.07]:
            s.bolt("brass",(x,y,.264),radius=.011)
    return s


def tender():
    s=Sculpt()
    s.box("black",(0,1.1,1.75),(2.5,.25,3.6))
    s.box("scarlet",(0,2.35,1.75),(2.6,2.1,3.5))
    s.box("soot",(0,3.38,1.70),(2.30,.12,3.1))
    for side in [-1,1]:
        for y in [1.50,3.17]:
            s.box("brass",(side*1.306,y,1.75),(.012,.014,3.1))
        for z in [.22,3.28]:
            s.box("brass",(side*1.306,2.34,z),(.012,1.68,.014))
        for z in [.6,1.75,2.9]:
            s.wheel(side*1.0,.70,z,.58)
        for z in [i*.16 for i in range(22)]:
            for y in [1.38,3.31]:
                s.bolt("black",(side*1.315,y,z),"x",.017)
    for i in range(80):
        x=math.sin(i*93.2)*1.10
        z=.25+(math.sin(i*35.7)*.5+.5)*2.9
        s.ball("soot",(x,3.42+.14*math.sin(i*2.5),z),.11+.05*(math.sin(i)+1),8,5)
    return s


def carriage():
    s=Sculpt()
    s.box("black",(0,1.0,5),(2.55,.22,10.0))
    s.box("scarlet",(0,1.9,5),(2.8,1.15,10.0))
    for side in [-1,1]:
        for z in [i*1.1+.6 for i in range(9)]:
            s.box("scarlet",(side*1.40,3.00,z),(.09,1.15,.12))
            s.box("glass",(side*1.40,3.00,z+.48),(.014,.88,.80))
            for y in [2.52,3.47]:
                s.box("brass",(side*1.46,y,z+.48),(.025,.020,.9))
            for zz in [z+.03,z+.93]:
                s.box("brass",(side*1.46,3.0,zz),(.025,.98,.020))
        for y in [1.47,2.45,3.62]:
            s.box("brass",(side*1.46,y,5),(.019,.018,9.8))
        for z in [1.1,1.9,8.1,8.9]:
            s.wheel(side*1.0,.66,z,.54)
    for z in [0,10]:
        s.box("scarlet",(0,2.7,z),(2.8,2.6,.1))
        s.box("black",(0,2.4,z),(.85,1.9,.24))
    vs=[]
    for z in [-.1,10.1]:
        for i in range(33):
            x=-1.50+3*i/32
            vs.append((x,3.64+.44*(1-(x/1.50)**2),z))
    s.mesh("black",vs,[(i,i+1,i+34,i+33) for i in range(32)])
    return s


def sign():
    s=Sculpt()
    s.cylinder("enamel",(0,0,-.035),(0,0,.035),.48,96)
    for z in [-.043,.043]:
        s.ring("black",(0,0,z),.48,.022,"z",96)
        for i in range(12):
            a=TAU*i/12
            s.bolt("black",(.455*math.cos(a),.455*math.sin(a),z),radius=.009)
    s.ring("black",(0,.57,0),.09,.017)
    s.tube("black",[(0,.63,0),(0,.81,0),(1.08,.81,0),(1.08,-.22,0)],.025)
    s.box("black",(1.08,.31,0),(.07,1.3,.06))
    s.cylinder("black",(.18,.76,0),(1.05,-.15,0),.018)
    for cx,cy,r in [(.27,.63,.12),(.57,.59,.17),(.83,.24,.17),(.94,.61,.10)]:
        pts=[]
        for i in range(75):
            a=i/74*TAU*1.55
            rr=r*(1-i/85)
            pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a),0))
        s.tube("black",pts,.013,8)
    s.ball("brass",(1.08,1.0,0),.044)
    return s


def lantern():
    s=Sculpt()
    s.box("enamel",(0,0,0),(.21,.35,.21))
    for x in [-.13,.13]:
        for z in [-.13,.13]:
            s.cylinder("black",(x,-.21,z),(x,.21,z),.014,8)
    for y in [-.22,.22]:
        s.box("black",(0,y,0),(.31,.035,.31))
    s.tube("black",[(0,.26,0),(0,.43,0),(0,.50,.30),(0,.35,.45)],.018)
    s.ball("brass",(0,.3,0),.045)
    return s


def build(root_path):
    root=Path(root_path)
    (root/"public"/"models").mkdir(parents=True,exist_ok=True)
    original_scene=bpy.context.window.scene
    mats={}
    for name,color,metal,rough in [
        ("scarlet",(.22,.029,.024,1),.38,.38),("black",(.026,.031,.035,1),.72,.43),
        ("steel",(.12,.135,.14,1),.88,.33),("brass",(.50,.29,.095,1),.8,.36),
        ("leather",(.20,.085,.026,1),0,.67),("wood",(.12,.062,.030,1),0,.69),
        ("cloth",(.14,.018,.039,1),0,.98),("enamel",(.64,.51,.32,1),.15,.38),
        ("glass",(.060,.105,.095,1),.35,.22),("soot",(.016,.019,.021,1),.25,.72)
    ]:
        mat=bpy.data.materials.new("PN_"+name)
        mat.diffuse_color=color
        mat.use_nodes=True
        bs=mat.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value=color
        bs.inputs["Metallic"].default_value=metal
        bs.inputs["Roughness"].default_value=rough
        mats[name]=mat
    generated=[]
    for name,factory in [("locomotive",locomotive),("trolley",trolley),("bench",bench),
                         ("tender",tender),("carriage",carriage),("sign",sign),("lantern",lantern)]:
        scene=factory().export(root,name,mats)
        generated.append({"name":name,"objects":len(scene.objects),"vertices":sum(len(o.data.vertices) for o in scene.objects)})
    bpy.context.window.scene=original_scene
    bpy.ops.wm.save_as_mainfile(filepath=str(root/".dream-loop"/"platform-nine-assets.blend"))
    return generated
