"""Normalize the successful TRELLIS reconstruction in Blender without flattening it."""
from pathlib import Path
import hashlib
import json
import bpy
from mathutils import Matrix


def prepare(root_path):
    root=Path(root_path)
    source=root/".dream-loop/trellis/.img2/artifacts/img2glb/locomotive.glb"
    original=bpy.context.window.scene
    scene=bpy.data.scenes.new("PlatformNine_ReconstructedLocomotive")
    bpy.context.window.scene=scene
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes=[obj for obj in scene.objects if obj.type=='MESH']
    if not meshes:
        raise ValueError("Reference reconstruction contains no mesh.")
    points=[obj.matrix_world@v.co for obj in meshes for v in obj.data.vertices]
    minimum=[min(p[i] for p in points) for i in range(3)]
    maximum=[max(p[i] for p in points) for i in range(3)]
    length,width,height=[maximum[i]-minimum[i] for i in range(3)]
    if min(length,width,height)<=0:
        raise ValueError("Reference reconstruction has a degenerate extent.")
    sx,sz,sy=12.72/length,3.0/width,5.17/height
    shift_z=maximum[0]*sx-.72
    shift_x=(minimum[1]+maximum[1])*.5*sz
    shift_y=.205-minimum[2]*sy
    transform=Matrix(((0,-sz,0,shift_x),(sx,0,0,-shift_z),(0,0,sy,shift_y),(0,0,0,1)))
    for i,obj in enumerate(meshes):
        obj.matrix_world=transform@obj.matrix_world
        obj.name=f"locomotive-reference_body_{i}"
        for polygon in obj.data.polygons:
            polygon.use_smooth=True
        obj.select_set(True)
    directory=root/".dream-loop/candidates"
    directory.mkdir(parents=True,exist_ok=True)
    output=directory/"locomotive-reference.glb"
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
                              use_active_scene=True,export_apply=True,export_animations=False,
                              export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
    bpy.context.window.scene=original
    metadata={
        "asset":"locomotive-reference.glb","method":"TRELLIS generative image-to-3D followed by Blender normalization",
        "provider":"trellis-community/TRELLIS","sourceImage":"isolation/locomotive.png",
        "sourceImageSha256":hashlib.sha256((root/".dream-loop/reference/isolation/locomotive.png").read_bytes()).hexdigest(),
        "rawMeshSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
        "runtimeMeshSha256":hashlib.sha256(output.read_bytes()).hexdigest(),
        "seed":0,"meshSimplify":.90,"textureSize":2048,
        "targetExtentMetres":{"length":12.72,"width":3.0,"height":5.17},
        "limitations":"Generative reconstruction; hidden surfaces inferred. Its UV texture is not a projection of the target scene.",
        "meshCount":len(meshes),"vertices":sum(len(o.data.vertices) for o in meshes),
    }
    (directory/"locomotive-reference.provenance.json").write_text(json.dumps(metadata,indent=2)+"\n")
    return metadata
