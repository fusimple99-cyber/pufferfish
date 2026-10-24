"""Compare GLB world-space vertices with Blender's evaluated source meshes."""
import json, struct, pathlib, hashlib
import numpy as np
from itertools import product

def nearest_errors(source, query):
    grid={}
    for p in source: grid.setdefault(tuple(np.round(p*10000).astype(int)),[]).append(p)
    result=[]
    for p in query:
        key=tuple(np.round(p*10000).astype(int))
        candidates=grid.get(key,[])
        if not candidates:
            candidates=[v for delta in product((-1,0,1),repeat=3) for v in grid.get(tuple(key[i]+delta[i] for i in range(3)),[])]
        result.append(min(float(np.linalg.norm(p-v)) for v in candidates) if candidates else float("inf"))
    return max(result)

root=pathlib.Path(__file__).resolve().parents[1]
raw=(root/'dist/assets/pufferfish.glb').read_bytes()
length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length])
binary=raw[28+length:]
def accessor(i):
    a=doc['accessors'][i]; v=doc['bufferViews'][a['bufferView']]
    dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return np.ndarray((a['count'],count),dtype=dtype,buffer=binary,offset=offset,strides=(v.get('byteStride',np.dtype(dtype).itemsize*count),np.dtype(dtype).itemsize)).copy()
def matrix(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape((4,4),order='F')
    x,y,z,w=n.get('rotation',[0,0,0,1])
    r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
    m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
expected=json.loads((root/'verification/export-report.json').read_text())
results=[]
def visit(i,parent):
    n=doc['nodes'][i];m=parent@matrix(n)
    if 'mesh' in n and n.get('name')!='Studio_Ground':
        parts=doc['meshes'][n['mesh']]['primitives']
        points=[];triangles=0
        for part in parts:
            p=accessor(part['attributes']['POSITION'])
            p=np.c_[p,np.ones(len(p))]@m.T
            points.append(p[:,[0,2,1]]*np.array([1,-1,1]))
            triangles+=len(accessor(part['indices']))//3
        exported=np.concatenate(points)
        source=np.array(json.loads((root/'verification'/f"{n['name']}-positions.json").read_text()))
        error=max(nearest_errors(source,exported),nearest_errors(exported,source))
        original=next(o for o in expected['objects'] if o['name']==n['name'])
        assert error < 2e-5, (n['name'],error)
        assert triangles==original['triangles'], (n['name'],triangles)
        results.append({'name':n['name'],'source_vertices':len(source),'exported_vertices_including_uv_seams':len(exported),'triangles':triangles,'max_position_error':float(error)})
    for child in n.get('children',[]):visit(child,m)
for i in doc['scenes'][doc.get('scene',0)]['nodes']:visit(i,np.eye(4))
assert len(results)==8
source_path=pathlib.Path('/Users/fusimple/Desktop/robot/河豚.blend')
current_hash=hashlib.sha256(source_path.read_bytes()).hexdigest()
assert current_hash==expected['source_sha256']
report={'passed':True,'source_unchanged':True,'source_sha256':current_hash,'mesh_count':len(results),'total_triangles':sum(o['triangles'] for o in results),'objects':results}
(root/'verification/geometry-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
