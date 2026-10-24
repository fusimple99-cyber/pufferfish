"""Run with Blender -b SOURCE.blend --python scripts/export_blend.py. Never saves the source."""
import bpy, json, pathlib, hashlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS=ROOT/'dist/assets'
scene=bpy.context.scene
scene.frame_set(1)
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=16
fish=[o for o in scene.objects if o.type=='MESH' and o.name!='Studio_Ground' and not o.hide_render]
report={'source_sha256':hashlib.sha256(pathlib.Path(bpy.data.filepath).read_bytes()).hexdigest(),'objects':[],'lights':[]}
for o in scene.objects:
    if o.type=='LIGHT':
        report['lights'].append(dict(name=o.name,position=list(o.matrix_world.translation),matrix=[list(r) for r in o.matrix_world],energy=o.data.energy,color=list(o.data.color),size=o.data.size,shape=o.data.shape,size_y=o.data.size_y))
for o in fish:
    ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=ev.to_mesh()
    mesh.calc_loop_triangles()
    coords=[list(o.matrix_world @ v.co) for v in mesh.vertices]
    report['objects'].append(dict(name=o.name,vertices=len(mesh.vertices),triangles=len(mesh.loop_triangles),uv_layers=[u.name for u in mesh.uv_layers],min=[min(v[i] for v in coords) for i in range(3)],max=[max(v[i] for v in coords) for i in range(3)]))
    # Store evaluated source positions for a numeric, export-independent comparison.
    (ROOT/'verification'/f'{o.name}-positions.json').write_text(json.dumps(coords))
    ev.to_mesh_clear()
    original=o.active_material
    if original.name!='Crystal_Amber_Gel': continue
    mat=original.copy()
    mat.name=f'{original.name}_{o.name}'
    o.data.materials[0]=mat
    tree=mat.node_tree
    bsdf=next(n for n in tree.nodes if n.type=='BSDF_PRINCIPLED')
    output=next(n for n in tree.nodes if n.type=='OUTPUT_MATERIAL')
    source=bsdf.inputs['Base Color'].links[0].from_socket
    emission=tree.nodes.new('ShaderNodeEmission')
    tree.links.new(source,emission.inputs['Color'])
    tree.links.new(emission.outputs[0],output.inputs['Surface'])
    image=bpy.data.images.new(f'{o.name}_color',width=1024 if 'Body' in o.name else 512,height=1024 if 'Body' in o.name else 512,alpha=False)
    image.colorspace_settings.name='sRGB'
    tex=tree.nodes.new('ShaderNodeTexImage')
    tex.image=image
    tree.nodes.active=tex
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active=o
    scene.render.bake.margin=12
    bpy.ops.object.bake(type='EMIT',use_clear=True)
    image.filepath_raw=str(ASSETS/f'{o.name}-color.png')
    image.file_format='PNG'
    image.save()
    tree.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
    tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    tree.nodes.remove(emission)
    print('BAKED',o.name,flush=True)
report['ground_height']=bpy.data.objects['Studio_Ground'].location.z
report['camera']={'matrix':[list(r) for r in scene.camera.matrix_world],'lens':scene.camera.data.lens,'sensor_width':scene.camera.data.sensor_width,'aspect':scene.render.resolution_x/scene.render.resolution_y}
report['world_color']=[.78*.35,.70*.35,.58*.35]
bpy.ops.object.select_all(action='DESELECT')
for o in fish+[bpy.data.objects['Studio_Ground'],scene.camera]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'pufferfish.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=True,export_lights=False,export_animations=False,export_extras=True,export_yup=True)
(ASSETS/'scene.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
(ROOT/'verification'/'export-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('EXPORT_COMPLETE',flush=True)
