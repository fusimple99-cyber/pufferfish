import bpy, json, pathlib
from mathutils import Vector
out = pathlib.Path(__file__).resolve().parents[1] / 'verification'
def val(v):
    try: return list(v)
    except: return v
data = {'objects': [], 'materials': [], 'world': [], 'render': {}}
for o in bpy.context.scene.objects:
    d = dict(name=o.name, type=o.type, location=list(o.location), rotation=list(o.rotation_euler), scale=list(o.scale), hidden=o.hide_render, matrix=[list(r) for r in o.matrix_world])
    if o.type == 'MESH':
        d.update(vertices=len(o.data.vertices), polygons=len(o.data.polygons), materials=[s.material.name if s.material else None for s in o.material_slots], bounds=[list(o.matrix_world @ Vector(p)) for p in o.bound_box], modifiers=[{'name':m.name, 'type':m.type, 'render':m.show_render, 'levels':getattr(m,'levels',None), 'render_levels':getattr(m,'render_levels',None)} for m in o.modifiers])
    if o.type == 'LIGHT': d.update(light_type=o.data.type,energy=o.data.energy,color=list(o.data.color),size=getattr(o.data,'size',None))
    if o.type == 'CAMERA': d.update(lens=o.data.lens,sensor_width=o.data.sensor_width,angle=o.data.angle)
    data['objects'].append(d)
for m in bpy.data.materials:
    d = {'name':m.name,'diffuse':list(m.diffuse_color),'nodes':[],'links':[]}
    if m.use_nodes:
        for n in m.node_tree.nodes:
            d['nodes'].append({'name':n.name,'type':n.type,'inputs':{i.name:val(i.default_value) for i in n.inputs if hasattr(i,'default_value')},'image':getattr(getattr(n,'image',None),'filepath',None)})
        d['links'] = [[l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name] for l in m.node_tree.links]
    data['materials'].append(d)
s=bpy.context.scene
data['render'] = dict(engine=s.render.engine, resolution=[s.render.resolution_x,s.render.resolution_y], camera=s.camera.name if s.camera else None, view_transform=s.view_settings.view_transform, look=s.view_settings.look, exposure=s.view_settings.exposure, gamma=s.view_settings.gamma)
if s.world and s.world.use_nodes:
    data['world']=[{'name':n.name,'type':n.type,'inputs':{i.name:val(i.default_value) for i in n.inputs if hasattr(i,'default_value')}} for n in s.world.node_tree.nodes]
(out/'source-inspection.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
print(json.dumps(data,ensure_ascii=False))
