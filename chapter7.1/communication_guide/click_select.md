```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER DOUBLE-CLICKS on canvas                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. POINTER CONTROLLER (ViewportSelector.ts)                       │
│    dblclick handler:                                         │
│      • onCanvasClick                │
│      • Call camera.pickFocalPoint(offsetX, offsetY)          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. CAMERA RAYCASTING (camera.ts)                             │
│    pickFocalPoint():                                         │
│      • Call intersect(screenX, screenY)                      │
│                                                              │
│    intersect():                                              │
│      • Convert screen → world ray                            │
│      • Test ray against all splat bounding boxes             │
│      • Find closest intersection                             │
│      • Return { splat, position, distance }                  │
│                                                              │
│    Back in pickFocalPoint():                                 │
│      • Set camera focal point to picked position             │
│      • Fire 'camera.focalPointPicked' event with splat       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. SELECTION STATE MANAGER (selection.ts)                    │
│    events.on('camera.focalPointPicked'):                     │
│      • setSelection(details.splat)                           │
│      • Update internal selection variable                    │
│      • Fire 'selection.changed' event                        │
└──────────────────────────────────────────────────────────────┘
```