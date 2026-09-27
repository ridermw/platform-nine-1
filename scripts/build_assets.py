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
    def __init__(self, quality=1):
        self.parts = {}
        self.quality = quality

    def mesh(self, material, vertices, faces, uv=None, smooth=False):
        data = self.parts.setdefault(material, [[], [], [], []])
        offset = len(data[0])
        data[0].extend(coord(v) for v in vertices)
        data[1].extend(tuple(offset + i for i in face) for face in faces)
        data[2].extend(uv or [(v[0] * .7 + v[2] * .19, v[1] * .7 + v[2] * .43) for v in vertices])
        data[3].extend(smooth and len(face) == 4 for face in faces)

    def box(self, m, p, size):
        x, y, z = p
        a, b, c = [v / 2 for v in size]
        vs = [(x + i*a, y+j*b, z+k*c) for i,j,k in
              [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
               (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        fs = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        self.mesh(m, vs, fs)

    def tube(self, m, points, radius, sides=10):
        sides=max(5,round(sides*self.quality))
        pts = [Vector(p) for p in points]
        if 3 < len(pts) < 9 and not isinstance(radius,list):
            smooth_points=[]
            for i in range(len(pts)-1):
                p0,p1,p2,p3=pts[max(i-1,0)],pts[i],pts[i+1],pts[min(i+2,len(pts)-1)]
                for j in range(8):
                    t=j/8
                    smooth_points.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
            pts=smooth_points+[pts[-1]]
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
        self.mesh(m,vertices,faces,uv,smooth=True)

    def cylinder(self, m, a, b, radius, sides=32):
        self.tube(m,[a,b],radius,sides)

    def ring(self, m, center, radius, tube=.02, axis="z", segments=64, sides=8, start=0, end=TAU):
        segments=max(12,round(segments*self.quality))
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
        self.mesh(m,vertices,faces,uv,smooth=True)

    def wheel(self,x,y,z,r):
        self.ring("steel",(x,y,z),r,.065,"x",64)
        self.ring("scarlet",(x,y,z),r-.08,.04,"x",64)
        self.cylinder("steel",(x-.09,y,z),(x+.09,y,z),.17,32)
        spokes=max(6,round(18*self.quality))
        for i in range(spokes):
            a=TAU*i/spokes
            self.cylinder("scarlet",(x,y+.15*math.cos(a),z+.15*math.sin(a)),
                          (x,y+(r-.06)*math.cos(a),z+(r-.06)*math.sin(a)),.036,8)
        self.bolt("brass",(x+.10,y,z),"x",.065)
        self.ring("steel",(x+.06,y,z),r-.035,.018,"x",64,6)
        for i in range(8):
            a=TAU*i/8
            self.bolt("black",(x+.10,y+.23*math.cos(a),z+.23*math.sin(a)),"x",.020)

    def export(self, root, name, materials):
        scene=bpy.data.scenes.new("PlatformNine_"+name)
        bpy.context.window.scene=scene
        for material,(vertices,faces,uv,smooth) in self.parts.items():
            mesh=bpy.data.meshes.new(name+"_"+material)
            mesh.from_pydata(vertices,[],faces)
            mesh.update()
            layer=mesh.uv_layers.new(name="UVMap")
            for face in mesh.polygons:
                face.use_smooth=smooth[face.index]
                for li in face.loop_indices:
                    layer.data[li].uv=uv[mesh.loops[li].vertex_index]
            obj=bpy.data.objects.new(name+"_"+material,mesh)
            scene.collection.objects.link(obj)
            obj.data.materials.append(materials[material])
            bevel = obj.modifiers.new("Machined edge bevel", "BEVEL")
            bevel.width = .032 if material == "leather" else (.016 if material == "cloth" else .006)
            bevel.segments = 3 if material in {"leather","cloth"} else 2
            bevel.limit_method = 'ANGLE'
            bevel.angle_limit = .65
            obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(root/"public"/"models"/(name+".glb")),
                                  export_format="GLB",use_selection=True,export_yup=True,
                                  use_active_scene=True,export_apply=True,export_animations=False,export_materials="EXPORT",
                                  export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
        return scene


def locomotive():
    s=Sculpt()
    s.box("black",(0,1.42,4.5),(1.55,.5,8.8))
    s.box("scarlet",(0,1.73,4.5),(2.9,.17,9.0))
    s.box("scarlet",(0,1.18,-.18),(2.9,.64,.22))
    s.mesh("black",[
        (-1.45,1.48,-.32),(1.45,1.48,-.32),(1.22,2.02,-.06),(-1.22,2.02,-.06),
        (-1.45,1.48,-.18),(1.45,1.48,-.18),(1.22,2.02,.08),(-1.22,2.02,.08)],
        [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    for x in [-1.12,-.74,-.37,0,.37,.74,1.12]:
        s.bolt("steel",(x,1.92,-.09),radius=.026)
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
        for i in range(28):
            t=i*TAU/28
            s.bolt("black",(1.034*math.cos(t),2.94+1.034*math.sin(t),z-.018),radius=.013)
    for y in [2.58,3.34]:
        s.box("black",(.40,y,.23),(.97,.06,.06))
        for x in [.05,.65,.82]:
            s.bolt("steel",(x,y,.18),radius=.023)
    for y in [2.56,2.83,3.10,3.37]:
        s.cylinder("steel",(.86,y-.085,.16),(.86,y+.085,.16),.044,16)
        s.bolt("black",(.86,y,.10),radius=.026)
    s.box("black",(.86,2.96,.20),(.10,.95,.065))
    for i in range(24):
        t=TAU*i/24
        s.box("steel",(.995*math.cos(t),2.94+.995*math.sin(t),.275),(.025,.033,.014))
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
        s.tube("black",[(side*.78,3.70,2.5),(side*1.13,3.32,2.7),
                        (side*1.18,2.45,3.0),(side*1.17,2.2,4.1),(side*1.12,2.3,6.3)],.038,12)
        for z in [3.0,3.8,4.6,5.4,6.2]:
            s.box("brass",(side*1.18,2.21,z),(.10,.10,.08))
            s.bolt("steel",(side*1.235,2.21,z),"x",.027)
        s.cylinder("brass",(side*1.09,2.04,2.20),(side*1.09,2.52,2.20),.12,32)
        for y in [2.06,2.46]:
            s.ring("steel",(side*1.09,y,2.20),.132,.018,"y",32)
        s.ring("brass",(side*1.24,2.51,2.20),.12,.018,"x",32)
        for t in [0,PI/2,PI,PI*1.5]:
            s.cylinder("brass",(side*1.24,2.51,2.20),
                          (side*1.24,2.51+.12*math.cos(t),2.20+.12*math.sin(t)),.010,6)
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
            for j in range(5):
                y=.46+j*.033
                s.tube("black",[(side*.85,y,z-.4),(side*.85,y-.05,z),(side*.85,y,z+.4)],.018,6)
            s.box("steel",(side*.91,.57,z),(.26,.35,.30))
            for zz in [-.11,.11]:
                s.bolt("black",(side*1.055,.61,z+zz),"x",.025)
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
    for x in [-.68,.58]:
        s.tube("soot",[(x,1.43,-.32),(x-.09,1.20,-.57),(x-.13,.66,-.70),(x+.03,.47,-.57)],.045,12)
        s.cylinder("brass",(x,1.38,-.30),(x,1.52,-.30),.078,16)
    s.box("black",(0,1.80,-.23),(.34,.10,.13))
    s.box("black",(0,1.68,-.30),(.24,.09,.20))
    s.box("brass",(0,4.02,.40),(.17,.23,.12))
    s.cylinder("enamel",(0,4.03,.30),(0,4.03,.29),.057,24)
    for vertices,_,_,_ in s.parts.values():
        for i,(x,minus_z,y) in enumerate(vertices):
            if minus_z>-.55 and y<2.38:
                weight=1-max(0,min(1,(y-1.72)/.66))
                vertices[i]=(x,minus_z,max(.035,y-.22*weight))
    return s


def trunk(s, pos, size):
    x,y,z=pos; w,h,d=size
    s.box("leather",pos,size)
    if d>w:
        for zz in [z-d*.28,z+d*.28]:
            for xx in [x-w*.505,x+w*.505]:
                s.box("leather",(xx,y,zz),(.023,h,.032))
            s.box("leather",(x,y+h*.505,zz),(w,.022,.032))
    else:
        for xx in [x-w*.34,x+w*.34]:
            for zz in [z-d*.505,z+d*.505]:
                s.box("leather",(xx,y,zz),(.028,h,.022))
            s.box("leather",(xx,y+h*.505,z),(.028,.024,d))
    for xx in [x-w*.49,x+w*.49]:
        for zz in [z-d*.50,z+d*.50]:
            s.box("brass",(xx,y,zz),(.035,h,.035))
            for yy in [y-h*.46,y+h*.46]:
                s.box("brass",(xx,y+(yy-y)*.95,zz),(.08,.05,.023))
                s.box("brass",(xx,yy,zz),(.045,.09,.023))
                s.bolt("black",(xx,yy,zz-.025),radius=.013)
    for yy in [y-h*.47,y+h*.47]:
        for zz in [z-d*.505,z+d*.505]:
            s.box("brass",(x,yy,zz),(w,.014,.015))
    for xx in [x-w*.25,x+w*.25]:
        s.box("brass",(xx,y+h*.25,z-d*.525),(.065,min(.10,h*.35),.02))
        s.bolt("black",(xx,y+h*.25,z-d*.54),radius=.012)
    s.tube("black",[(x-.12,y+.01,z-d*.54),(x-.09,y+.07,z-d*.59),(x+.09,y+.07,z-d*.59),(x+.12,y+.01,z-d*.54)],.022)
    for i in range(9):
        for xx in [x-w*.48,x+w*.48]:
            s.bolt("brass",(xx,y-h*.4+i*h*.1,z-d*.525),radius=.009)


def trolley():
    s=Sculpt()
    s.box("wood",(0,.29,0),(.74,.08,1.40))
    for x in [-.35,.35]:
        s.cylinder("brass",(x,.34,-.69),(x,.34,.69),.026)
        for z in [-.55,.55]:
            s.cylinder("soot",(x-.025,.135,z),(x+.025,.135,z),.13,40)
            s.ring("black",(x,.135,z),.111,.023,"x",40,8)
            s.cylinder("brass",(x-.038,.135,z),(x+.038,.135,z),.038,24)
            s.ring("brass",(x+.028,.135,z),.084,.010,"x",32,6)
            for i in range(6):
                t=i*TAU/6
                s.cylinder("brass",(x+.027,.135+.04*math.cos(t),z+.04*math.sin(t)),
                             (x+.027,.135+.08*math.cos(t),z+.08*math.sin(t)),.010,6)
            for xx in [x-.042,x+.042]:
                s.box("brass",(xx,.226,z),(.014,.19,.052))
    for z in [-.69,.69]:
        s.cylinder("brass",(-.35,.34,z),(.35,.34,z),.026)
    s.tube("brass",[(-.33,.34,.64),(-.33,1.67,.64),(-.28,1.81,.64),
                    (-.18,1.86,.64),(.18,1.86,.64),(.28,1.81,.64),
                    (.33,1.67,.64),(.33,.34,.64)],.022,12)
    for y in [.74,1.17]:
        s.cylinder("brass",(-.33,y,.64),(.33,y,.64),.016)
    trunk(s,(0,.66,-.02),(.67,.62,1.16))
    trunk(s,(0,1.06,.34),(.60,.16,.55))
    trunk(s,(0,1.06,-.32),(.59,.16,.49))
    # Bird cage: individual wires with a smoothly domed top.
    cx,cy,cz=0,1.16,.35
    r=.255
    s.cylinder("brass",(cx,cy,cz),(cx,cy+.045,cz),r,64)
    for i in range(40):
        a=TAU*i/40
        pts=[(cx+r*math.cos(a),cy,cz+r*math.sin(a)),(cx+r*math.cos(a),cy+.38,cz+r*math.sin(a))]
        for j in range(1,13):
            t=j*PI/24
            pts.append((cx+r*math.cos(t)*math.cos(a),cy+.38+r*math.sin(t),cz+r*math.cos(t)*math.sin(a)))
        s.tube("brass",pts,.0045,6)
    for h in [.055,.20,.37,.42]:
        s.ring("brass",(cx,cy+h,cz),r,.008,"y",64,6)
    s.ring("brass",(cx,cy+.665,cz),.032,.008,"z",24,6)
    s.cylinder("wood",(cx-r*.8,cy+.13,cz),(cx+r*.8,cy+.13,cz),.016)
    # Continuous cloth shell with folds and draped tassels, not stacked boxes.
    vs=[]; fs=[]; uv=[]; nx=40; nz=48
    for j in range(nz+1):
        t=j/nz
        z=-.08-.71*t
        y=1.29 if t<.70 else 1.29-(t-.70)*1.12
        for i in range(nx+1):
            u=i/nx; x=-.28+u*.56
            vs.append((x,y+.008*math.sin(u*TAU*4+t*4)+.006*math.sin(t*TAU*3),z))
            uv.append((u*2,t*3))
            if i and j:
                n=j*(nx+1)+i
                fs.append((n,n-1,n-nx-2,n-nx-1))
    s.mesh("cloth",vs,fs,uv,smooth=True)
    for k in range(34):
        x=-.28+k*.56/33
        s.tube("cloth",[(x,.955,-.79),(x+.004,.905,-.80),(x-.003,.85,-.79)],.0035,5)
    # A folded return of the same blanket sits on the top face.
    for j in range(3):
        s.box("cloth",(0,1.165+j*.048,-.33),(.56,.045,.45))
        s.tube("cloth",[(-.26,1.165+j*.048,-.56),(-.21,1.19+j*.048,-.58),
                        (.21,1.19+j*.048,-.58),(.26,1.165+j*.048,-.56)],.020,10)
    return s


def bench():
    s=Sculpt()
    for z in [-.25,-.125,0,.125,.25]:
        s.box("wood",(0,.52,z),(1.8,.055,.105))
    for y in [.68,.81,.94,1.07]:
        s.box("wood",(0,y,.30+(y-.68)*.22),(1.8,.10,.055))
    for x in [-.73,.73]:
        for z in [-.24,.24]:
            s.tube("black",[(x,.06,z+.10),(x,.4,z),(x,.55,z)],.045)
        s.tube("black",[(x,.50,-.27),(x,.68,-.36),(x,.77,-.29),(x,.78,-.17),
                        (x,.75,.14),(x,.85,.28),(x,1.12,.39)],.035)
        s.ring("black",(x,.69,-.27),.083,.025,"x",40,8,.25,TAU)
        s.ring("brass",(x,.69,-.27),.067,.009,"x",32,6,.25,TAU)
        s.ring("black",(x,.30,.07),.16,.024,"x",40)
        for angle in [0,PI/2,PI,3*PI/2]:
            s.ring("black",(x,.30+.041*math.cos(angle),.07+.041*math.sin(angle)),.045,.013,"x",20,6)
        s.tube("black",[(x,.05,-.30),(x,.30,-.16),(x,.53,-.24)],.044)
        s.tube("black",[(x,.05,.34),(x,.30,.22),(x,.52,.28)],.044)
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


def carriage(low_detail=False):
    s=Sculpt(.35 if low_detail else 1)
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
    # Six tapered glass panes, shaped cap, turned finials, and scroll bracket.
    n=6
    for i in range(n):
        t=i*TAU/n;u=(i+1)*TAU/n
        bottom=(.115*math.cos(t),-.22,.115*math.sin(t))
        top=(.185*math.cos(t),.22,.185*math.sin(t))
        s.mesh("enamel",[bottom,(.115*math.cos(u),-.22,.115*math.sin(u)),
                         (.185*math.cos(u),.22,.185*math.sin(u)),top],[(0,1,2,3)])
        s.cylinder("black",bottom,top,.015,8)
    for y,r in [(-.24,.13),(.24,.20),(.27,.205)]:
        s.cylinder("black",(0,y,0),(0,y+.025,0),r,6)
    s.tube("black",[(0,.29,0),(0,.43,0)],[.20,.04],6)
    for y,r in [(.43,.052),(.47,.038),(.52,.019),(-.28,.075),(-.34,.039),(-.40,.025)]:
        s.ball("black",(0,y,0),r)
    s.box("black",(0,-.31,.46),(.07,.50,.045))
    s.cylinder("black",(0,-.30,0),(0,-.30,.45),.023)
    s.tube("black",[(0,-.29,.04),(0,-.42,.09),(0,-.53,.32),(0,-.48,.45),(0,-.23,.46)],.016)
    s.ring("black",(0,-.39,.30),.08,.012,"x",40,8,.3,TAU*1.6)
    s.ball("brass",(0,.54,0),.026)
    return s


def build(root_path, only=None):
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
                         ("tender",tender),("carriage",carriage),("carriage-far",lambda:carriage(True)),("sign",sign),("lantern",lantern)]:
        if only is not None and name!=only:
            continue
        scene=factory().export(root,name,mats)
        generated.append({"name":name,"objects":len(scene.objects),"vertices":sum(len(o.data.vertices) for o in scene.objects)})
    if not generated:
        raise ValueError(f"Unknown asset selection: {only}")
    bpy.context.window.scene=original_scene
    bpy.ops.wm.save_as_mainfile(filepath=str(root/".dream-loop"/"platform-nine-assets.blend"))
    return generated
