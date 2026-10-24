import bpy, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
s=bpy.context.scene
s.render.engine='CYCLES'
s.cycles.device='CPU'
s.cycles.samples=48
s.cycles.use_denoising=True
s.render.resolution_percentage=50
s.render.image_settings.file_format='PNG'
s.render.filepath=str(root/'verification/blender-white-reference.png')
bpy.data.objects['Studio_Ground'].hide_render=True
w=s.world.node_tree
output=next(n for n in w.nodes if n.type=='OUTPUT_WORLD')
original=output.inputs['Surface'].links[0].from_socket
path=w.nodes.new('ShaderNodeLightPath')
white=w.nodes.new('ShaderNodeBackground')
white.inputs['Color'].default_value=(1,1,1,1)
white.inputs['Strength'].default_value=1
mix=w.nodes.new('ShaderNodeMixShader')
w.links.new(path.outputs['Is Camera Ray'],mix.inputs[0])
w.links.new(original,mix.inputs[1])
w.links.new(white.outputs[0],mix.inputs[2])
w.links.new(mix.outputs[0],output.inputs['Surface'])
s.render.film_transparent=True
s.render.image_settings.color_mode='RGBA'
bpy.ops.render.render(write_still=True)
