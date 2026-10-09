import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def rgba(h):
    r, g, b = ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255
    return (lin(r), lin(g), lin(b), 1.0)

def paint(o, h, jitter=0.0, seed=0):
    me = o.data
    for a in list(me.color_attributes):
        me.color_attributes.remove(a)
    ca = me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='CORNER')
    base = rgba(h) if isinstance(h, int) else h
    rnd = random.Random(seed + len(me.polygons))
    for poly in me.polygons:
        j = 1.0 + (rnd.random() - 0.5) * 2 * jitter if jitter else 1.0
        col = (min(1, base[0] * j), min(1, base[1] * j), min(1, base[2] * j), 1.0)
        for li in poly.loop_indices:
            ca.data[li].color = col
    me.color_attributes.active_color = ca
    return o

def link(o):
    bpy.context.collection.objects.link(o)
    return o

def new_obj(name, me):
    o = bpy.data.objects.new(name, me)
    link(o)
    return o

def select_only(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o

def apply_all(o):
    select_only(o)
    if o.type != 'MESH':
        bpy.ops.object.convert(target='MESH')
    else:
        for m in list(o.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=m.name)
            except Exception as e:
                print('mod fail', m.name, e)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return bpy.context.active_object

def finish(o, col, bevel=0.0, sub=0, smooth=True, jitter=0.0, seed=0, bev_seg=2):
    select_only(o)
    if bevel > 0:
        m = o.modifiers.new('b', 'BEVEL')
        m.width = bevel
        m.segments = bev_seg
        m.limit_method = 'ANGLE'
    if sub > 0:
        m = o.modifiers.new('s', 'SUBSURF')
        m.levels = sub
        m.render_levels = sub
    o = apply_all(o)
    if smooth:
        select_only(o)
        bpy.ops.object.shade_smooth()
    else:
        select_only(o)
        bpy.ops.object.shade_flat()
    paint(o, col, jitter, seed)
    return o

def mesh_from_bm(bm, name):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me

def box(name, size, loc=(0, 0, 0), rot=(0, 0, 0), col=0xffffff, bevel=0.01, sub=0, smooth=True, jitter=0.0, taper=None, native=False):
    if not native:
        size = (size[0], size[2], size[1]); rot = (rot[0], -rot[2], rot[1])
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if taper:  # (top_scale_x, top_scale_y) scale for +Z verts
        for v in bm.verts:
            if v.co.z > 0:
                v.co.x *= taper[0]; v.co.y *= taper[1]
    o = new_obj(name, mesh_from_bm(bm, name))
    o.location = loc
    o.rotation_euler = Euler(rot, 'XYZ')
    return finish(o, col, bevel, sub, smooth, jitter)

def cyl(name, r1, r2, depth, loc=(0, 0, 0), rot=(0, 0, 0), col=0xffffff, seg=12, bevel=0.0, sub=0, smooth=True, cap=True, jitter=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=depth)
    o = new_obj(name, mesh_from_bm(bm, name))
    o.location = loc
    o.rotation_euler = Euler(rot, 'XYZ')
    return finish(o, col, bevel, sub, smooth, jitter)

def sphere(name, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), col=0xffffff, seg=12, rings=8, smooth=True, jitter=0.0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    o = new_obj(name, mesh_from_bm(bm, name))
    o.location = loc
    o.rotation_euler = Euler(rot, 'XYZ')
    return finish(o, col, 0, 0, smooth, jitter)

def torus(name, R, r, loc=(0, 0, 0), rot=(0, 0, 0), col=0xffffff, seg=24, rseg=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=rseg, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    return finish(o, col, 0, 0, True)

def tube(name, pts, r, col=0xffffff, seg=8, res=6, cyclic=False, taper_end=None):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = max(1, seg // 4)
    cu.resolution_u = res
    cu.use_fill_caps = True
    sp = cu.splines.new('POLY' if len(pts) == 2 else 'NURBS')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (p[0], p[1], p[2], 1)
    if len(pts) > 2:
        sp.order_u = min(4, len(pts))
        sp.use_endpoint_u = True
    sp.use_cyclic_u = cyclic
    o = new_obj(name, cu)
    return finish(o, col, 0, 0, True)

def lathe(name, profile, loc=(0, 0, 0), rot=(0, 0, 0), col=0xffffff, seg=12, smooth=True, axis='Z'):
    """profile: list of (radius, height) around Z axis"""
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0, h)) for r, h in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=math.pi * 2, steps=seg)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(name, mesh_from_bm(bm, name))
    o.location = loc
    o.rotation_euler = Euler(rot, 'XYZ')
    return finish(o, col, 0, 0, smooth)

def plane(name, w, h, loc=(0, 0, 0), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    select_only(o)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return o

def join(objs, name):
    objs = [o for o in objs if o is not None]
    select_only(objs[0])
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    return o

def set_origin(o, pt):
    cur = bpy.context.scene.cursor.location.copy()
    bpy.context.scene.cursor.location = pt
    select_only(o)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = cur

def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    link(e)
    return e

def parent(child, par):
    select_only(child)
    par.select_set(True)
    bpy.context.view_layer.objects.active = par
    bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

def export(path, objs=None, meshopt=False):
    bpy.ops.object.select_all(action='DESELECT')
    if objs:
        for o in objs:
            o.select_set(True)
    kw = dict(filepath=path, export_format='GLB', use_selection=bool(objs), export_apply=True, export_yup=True,
              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_materials='NONE' if False else 'EXPORT',
              export_cameras=False, export_lights=False, export_animations=False, export_normals=True, export_tangents=False,
              export_texcoords=True)
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError as e:
        print('export kw issue', e)
        kw.pop('export_all_vertex_colors', None)
        bpy.ops.export_scene.gltf(**kw)

def noise_rock(name, r, seed, col, flat=True, detail=2, squash=0.8, jit=0.12):
    rnd = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=r)
    for v in bm.verts:
        n = v.co.normalized()
        k = 1 + (rnd.random() - 0.5) * 2 * jit
        v.co = n * r * k
        v.co.z *= squash
    # crude flatten bottom
    for v in bm.verts:
        if v.co.z < -r * squash * 0.5:
            v.co.z = -r * squash * 0.5
    o = new_obj(name, mesh_from_bm(bm, name))
    return finish(o, col, 0, 0, not flat, jitter=0.18, seed=seed)
