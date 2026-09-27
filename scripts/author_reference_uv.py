"""Paint visible solid-mesh surfaces from the de-lit asset reference, not the scene target."""
from pathlib import Path
import json
import hashlib
import re
import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def author(root_path):
    root=Path(root_path)
    fit=json.loads((root/"scripts/data/locomotive-surface-fit.json").read_text())
    original=bpy.context.window.scene
    scene=bpy.data.scenes.new("PlatformNine_ReferenceUV")
    bpy.context.window.scene=scene
    bpy.ops.import_scene.gltf(filepath=str(root/"public/models/locomotive.glb"))
    objects=[o for o in scene.objects if o.type=='MESH']
    for obj in objects:
        bm=bmesh.new();bm.from_mesh(obj.data)
        long_edges=[e for e in bm.edges if e.calc_length()>.18]
        if long_edges:
            bmesh.ops.subdivide_edges(bm,edges=long_edges,cuts=6,use_grid_fill=True)
            bmesh.ops.triangulate(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free();obj.data.update()
    vertices=[];faces=[]
    for obj in objects:
        offset=len(vertices)
        vertices.extend(tuple(obj.matrix_world@v.co) for v in obj.data.vertices)
        faces.extend(tuple(offset+i for i in polygon.vertices) for polygon in obj.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces,all_triangles=True)
    cam=np.array(fit["camera"])
    camera=Vector((-cam[0],-cam[2]/fit["zScale"],cam[1]))
    forward,right,up=[np.array(fit[k]) for k in ["forward","right","up"]]
    width,height=fit["imageSize"]
    anchors=np.array([p["projected"] for p in fit["landmarks"]])/np.array([width,height])
    observed=np.array([p["observed"] for p in fit["landmarks"]])/np.array([width,height])
    def kernel(a,b):
        r=np.linalg.norm(a[:,None,:]-b[None,:,:],axis=-1)
        return r*r*np.log(np.maximum(r,1e-9))
    p=np.column_stack([np.ones(len(anchors)),anchors])
    k=kernel(anchors,anchors)+np.eye(len(anchors))*1e-6
    system=np.block([[k,p],[p.T,np.zeros((3,3))]])
    coefficients=np.linalg.solve(system,np.vstack([observed-anchors,np.zeros((3,2))]))
    def uv_for(points):
        xyz=np.column_stack([points[:,0],points[:,2],-points[:,1]])
        ref=xyz*np.array([-1,1,fit["zScale"]])-cam
        depth=ref@forward
        uv=np.column_stack([.5+(ref@right)*fit["focal"]/depth/width,
                           .5-(ref@up)*fit["focal"]/depth/height])
        uv+=np.column_stack([kernel(uv,anchors),np.ones(len(uv)),uv])@coefficients
        uv[:,1]=1-uv[:,1]
        return uv
    image=bpy.data.images.load(str(root/".dream-loop/reference/isolation/delit/locomotive.png"))
    image.colorspace_settings.name='sRGB'
    iw,ih=image.size
    pixels=np.asarray(image.pixels[:],dtype=np.float32).reshape(ih,iw,4)
    painted=0;total=0;report=[]
    for obj in objects:
        material=obj.data.materials[0]
        key=re.sub(r"\.\d+$","",material.name)
        refmat=bpy.data.materials.new(key+"_refpaint")
        refmat.use_nodes=True
        bs=refmat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Roughness'].default_value=.65
        tex=refmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND'
        uvnode=refmat.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='ReferenceSurface'
        refmat.node_tree.links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
        refmat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        obj.data.materials.append(refmat)
        uv_layer=obj.data.uv_layers.new(name='ReferenceSurface')
        points=np.array([tuple(obj.matrix_world@v.co) for v in obj.data.vertices])
        mapped=uv_for(points)
        normals=obj.matrix_world.to_3x3().inverted().transposed()
        assigned=0
        for polygon in obj.data.polygons:
            for loop in polygon.loop_indices:
                uv_layer.data[loop].uv=mapped[obj.data.loops[loop].vertex_index]
            center=obj.matrix_world@polygon.center
            direction=center-camera;distance=direction.length;direction.normalize()
            normal=(normals@polygon.normal).normalized()
            total+=1
            if normal.dot(-direction)<.08:
                continue
            uv=mapped[list(polygon.vertices)].mean(axis=0)
            if not (.005<uv[0]<.995 and .005<uv[1]<.995):
                continue
            if pixels[int(uv[1]*(ih-1)),int(uv[0]*(iw-1)),3]<.65:
                continue
            hit=tree.ray_cast(camera,direction,distance+.05)
            if hit[0] is not None and abs(hit[3]-distance)<.035:
                polygon.material_index=1
                painted+=1;assigned+=1
        obj.select_set(True)
        report.append({"object":obj.name,"painted":assigned,"faces":len(obj.data.polygons)})
    output=root/"public/models/locomotive-surfaced.glb"
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
                              use_active_scene=True,export_apply=True,export_animations=False,
                              export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    bpy.context.window.scene=original
    result={"painted":painted,"faces":total,"objects":report,"asset":output.name,
            "source":"isolation/delit/locomotive.png",
            "sourceSha256":hashlib.sha256((root/".dream-loop/reference/isolation/delit/locomotive.png").read_bytes()).hexdigest(),
            "geometrySha256":hashlib.sha256((root/"public/models/locomotive.glb").read_bytes()).hexdigest(),
            "runtimeSha256":hashlib.sha256(output.read_bytes()).hexdigest(),
            "method":"fixed asset UVs, visible faces only, authored solid geometry preserved and subdivided for surface detail",
            "hiddenSurfaces":"Retain the existing authored PBR materials.",
            "cameraFitRmsPixels":fit["rmsePixels"]}
    (root/"public/models/locomotive-surfaced.provenance.json").write_text(json.dumps(result,indent=2)+"\n")
    return result
