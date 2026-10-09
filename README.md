# The Italian Stallion #746

A 3D motocross portfolio for Adriano Catalano, South African MX rider. You ride his KTM across a hand-built track, hit the jumps and run into his results, sponsors and story on boards along the way.

**Live site:** https://adriano-catalano-746.vercel.app

Built with three.js and Blender models, in the spirit of Bruno Simon's driving portfolio.

## What is in it

- A playable bike with throttle, wheelies, jumps, whips and a suspension tune (press `T` to retune the forks and shock, a nod to his day job as a suspension tech)
- Track boards covering the rider bio, 2025 results, sponsors, gallery and contact
- Sponsor logos (Dragon Energy, CWorx) on the track
- Touch controls and a layout that works on phones
- A "Classic site" button with a plain scrolling version, which is also the fallback when WebGL is not available

## Controls

| Input | Action |
| --- | --- |
| `W` or up | Throttle (hold it) |
| `A` `D` or left and right | Steer |
| `S` or down | Brake, then reverse |
| `Shift` or `E` | Clutch kick wheelie |
| `Space` | Whip in the air |
| `T` | Retune suspension |
| `M` | Open the map |
| `R` | Respawn |
| Touch | On-screen stick and buttons |

## Stack

- [three.js](https://threejs.org) for rendering
- [Vite](https://vitejs.dev) for dev and builds
- Blender (`bpy` scripts) for the bike, rider and props, exported as glTF and packed with `gltfpack`
- Plain JavaScript, no framework

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Project layout

```
src/
  main.js       game loop, bike physics, camera, controls
  boards.js     the canvas-drawn boards along the track
  content.js    all site copy, edit here to change wording
  style.css     HUD and layout
public/
  models/       packed .glb models
  logos/        sponsor logos
models/         Blender scripts that generate the models
```

## Rebuilding the models

The models are generated from code. With Blender's Python module installed (`pip install bpy`):

```bash
cd models
python3 bike.py && python3 rider.py && python3 props.py
npx gltfpack -i bike_raw.glb -o ../public/models/bike.glb -cc -vpf -vn 8 -vc 8 -kn
```

Repeat the `gltfpack` step for `rider` and `props`.

## Deploying

The site is a static Vite build and deploys to Vercel with `npx vercel --prod`.

## Credits

Design and code by [Dylan Jonker](https://github.com/DylieD). Rider, photos and sponsor marks belong to Adriano Catalano and his sponsors and are used with permission.
