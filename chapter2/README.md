# Chapter 2: The Rendering Foundation & Game Mathematics

## The Illusion of Reality: What Does "Rendering" Mean?

Before we dive into the history and implementation, let's start with a fundamental question: **What are we actually doing when we "render" a 3D world?**

### You've Never Actually Seen a 3D World on Your Screen

Think about this: your screen is **completely flat**. It's a 2D grid of pixels—tiny colored dots arranged in rows and columns. Yet somehow, when you play a game or watch a 3D movie, you perceive depth, distance, and three-dimensional space.

**You're experiencing an illusion.**

Every 3D scene you've ever seen on a screen is actually a carefully crafted 2D image designed to trick your visual system into perceiving depth. This trick works because of how our brains interpret visual cues:

- **Perspective**: Objects farther away appear smaller
- **Occlusion**: Closer objects block farther objects
- **Lighting**: Shadows and shading reveal 3D shape
- **Parallax**: Objects at different depths move at different speeds

The real world "renders" itself naturally—light bounces off surfaces, enters your eyes, and your brain reconstructs a 3D understanding. But a computer screen can't bounce light in 3D space. It can only display colored pixels.

**Rendering is the process of converting a 3D world description into a 2D image that creates the illusion of 3D.**

### How Do We Represent a 3D World in a Computer?

A computer can't actually "contain" a 3D world any more than a blueprint contains a building. Instead, we store a **mathematical description** of the world.

**What we store:**

1. **Positions** - Where things are in 3D space (x, y, z coordinates)
   ```
   Cube corner at position: (1.0, 2.0, 3.0)
   Camera at position: (0.0, 5.0, 10.0)
   ```

2. **Geometry** - The shapes that make up objects (triangles, mostly)
   ```
   A cube is: 12 triangles (2 per face × 6 faces)
   Each triangle is: 3 points in 3D space
   ```

3. **Properties** - How things look (color, texture, shininess)
   ```
   Material: Red, metallic, reflective
   Texture: "brick.png" mapped to surface
   ```

4. **Lights** - Where light comes from and how bright
   ```
   Sun: directional light from above, white, very bright
   ```

5. **Camera** - Where we're viewing from and in what direction
   ```
   Position: (0, 5, 10)
   Looking at: (0, 0, 0)
   Field of view: 75 degrees
   ```

**The crucial insight**: This is all just numbers in memory. A 3D world exists as:
```
vertices: [
  {x: 1.0, y: 1.0, z: 1.0},
  {x: -1.0, y: 1.0, z: 1.0},
  // ... thousands more
]
triangles: [
  {v1: 0, v2: 1, v3: 2},
  {v1: 1, v2: 3, v3: 2},
  // ... thousands more
]
materials: [
  {color: 0xff0000, roughness: 0.5},
  // ...
]
```

**Nothing is actually "3D" in the computer—it's all just numbers that describe a 3D space.**

### What Does "Rendering" Actually Do?

Rendering is answering the question: **"For each pixel on my 2D screen, what color should it be to make it look like I'm viewing this 3D world?"**

Think of it like photography:
1. You have a 3D scene (the real world)
2. You have a camera at a specific position and angle
3. Light bounces around the scene
4. The camera captures a 2D image

Rendering does the same thing, but instead of real light and a real camera, we simulate it mathematically.

**The rendering process (simplified):**

```
For each pixel on screen (e.g., pixel at row 100, column 200):
    1. Calculate: "What 3D point in the world does this pixel represent?"
    2. Check: "What object (if any) is at that 3D point?"
    3. Calculate: "How is that object lit by the lights in the scene?"
    4. Set the pixel to that color
```

Do this for every pixel (1920×1080 = 2,073,600 pixels on a 1080p screen), and you have one frame. Do it 60 times per second, and you have motion.

### The Fundamental Challenge: The Hidden Surface Problem

Here's where it gets interesting. Imagine you're looking at a scene with a cube in front of a sphere. When you look at the pixel where the cube is, you can see the cube. But there's also a sphere behind it.

**Which one do you see?**

Obviously, the cube—it's closer. But the computer doesn't inherently know this. It just has a list of objects. Without solving this problem, you'd see a jumbled mess where distant objects draw over nearby ones.

This is called the **hidden surface problem**: determining which surfaces are visible and which are blocked by other surfaces.

Solving this problem is what made real-time 3D graphics possible. Let's see how different approaches tackled it.

### Early Representations: Before We Could Render Anything

In the 1960s, computers could barely display anything at all. The first representations of 3D objects were incredibly simple:

**1. Wireframe Representation (1960s)**

The simplest way to represent a 3D object: just store its edges.

```
A cube:
- 8 vertices (corners)
- 12 edges (lines connecting vertices)

That's it. No surfaces, no colors, just lines.
```

On screen, you'd see just the outline—like a sketch of a cube made with a pen. No hidden surfaces removed—you could see all the edges, even the ones that should be behind the cube.

**Why wireframe?**
- **Memory constraints**: Storing just edges used minimal memory
- **Computing power**: Drawing lines was all computers could do in real-time
- **Display technology**: Early vector displays could only draw lines, not filled shapes

**The problem**: It's confusing. Which edges are in front? It looks like a flat drawing, not a 3D object. You can't tell what's behind what.

**2. Solid Model Representation (Late 1960s)**

The breakthrough: store not just edges, but **faces** (surfaces).

```
A cube:
- 8 vertices
- 6 faces (each face is a quadrilateral)
OR
- 8 vertices  
- 12 triangular faces (2 triangles per face)

Now we have actual surfaces, not just edges!
```

This representation includes enough information to determine what blocks what. But displaying it is another matter—that's where rendering algorithms come in.

**Why triangles?**
Even though a cube has square faces, we typically break them into triangles because:
- Triangles are **always planar** (flat) - three points always define a plane
- Squares might warp in 3D (the four corners might not be perfectly flat)
- Triangles are the simplest polygon—easier math
- Graphics hardware is optimized for triangles

**This is still how we represent 3D worlds today.** Modern games use the same basic representation: vertices and triangles. A modern game character might have 50,000 triangles instead of 12, but the fundamental concept is identical.

### Now We Can Begin: Rendering These Representations

With a solid model representation (vertices and faces), we can finally attempt to render—to create that 2D image that looks 3D.

But how? We have triangles in 3D space and a 2D screen. We need an algorithm to figure out:
1. Where each triangle appears on screen
2. Which triangles are visible (and which are hidden)
3. What color each visible triangle should be

This is where the history of rendering algorithms begins...

## From Pixels to Polygons: A Brief History of Computer Graphics

Now that we understand what we're trying to accomplish—creating a 2D image from a 3D description—let's see how computer scientists solved this problem over the decades.

### The Dawn of Computer Graphics (1960s-1970s)

In the beginning, there were **vector displays**—cathode ray tubes that drew lines by directing an electron beam. Early computer graphics systems like **Sketchpad** (1963) by Ivan Sutherland allowed users to draw geometric shapes using a light pen.

These systems were revolutionary, but they had a problem: they could only draw wireframes. No solid surfaces, no colors, just glowing green lines on a black screen.

**The fundamental challenge**: How do you make a collection of lines look like a solid object?

### The Painter's Algorithm (1970s)

The first solution was beautifully simple: **draw things in order from back to front**, just like a painter working on a canvas.

```
Algorithm:
1. Sort all polygons by distance from camera (furthest first)
2. Draw them in that order
3. Each polygon paints over what's behind it
```

**Example**: Imagine rendering a scene with a cube in front of a sphere.
1. Draw the sphere (it's farther away)
2. Draw the cube (it's closer, so it paints over the sphere)
3. The cube appears in front

This worked! But it had problems:

**Problem 1: Sorting is expensive**
- Every frame, you need to sort potentially thousands of polygons
- On 1970s hardware, this was painfully slow

**Problem 2: Overlapping polygons**
- What if polygon A is in front of polygon B, but B is in front of polygon C, and C is in front of A?
- The painter's algorithm breaks down completely

**Problem 3: Not really "3D"**
- You're just drawing 2D shapes in a particular order
- No depth information is actually stored

Despite these limitations, the painter's algorithm was used in early 3D games like **Battlezone** (1980) and flight simulators.

### The Z-Buffer Revolution (1974)

Then came a breakthrough that changed everything: the **Z-buffer** (also called depth buffer), invented by Ed Catmull (yes, the Pixar co-founder).

The idea was genius in its simplicity:

**Instead of sorting polygons, store the depth of each pixel.**

```
For each pixel on screen:
    - Store the color (RGB)
    - Store the depth (Z value - distance from camera)

When drawing a new pixel:
    if (new_depth < stored_depth) {
        // This pixel is closer, so draw it
        pixel_color = new_color
        pixel_depth = new_depth
    } else {
        // This pixel is farther, ignore it
    }
```

**Why this was revolutionary**:
1. **No sorting required** - Draw polygons in any order
2. **Handles all cases** - Overlapping polygons? No problem
3. **Per-pixel accuracy** - Each pixel knows exactly what's in front
4. **Easy to implement** - Just an array of depth values

**The cost**: Memory. Every pixel needs to store a depth value. On a 640x480 screen, that's 307,200 depth values. In 1974, that was expensive. Today, it's trivial.

The Z-buffer became the foundation of modern real-time 3D graphics. Every game you've played in the last 30 years uses it.

### Rasterization: Turning Triangles into Pixels (1970s-1980s)

With the Z-buffer handling depth, the next challenge was: **how do you turn a 3D triangle into pixels on screen?**

This process is called **rasterization**, and it's what happens in the rendering pipeline:

```
3D Triangle (in world space)
    ↓
Transform to screen space (perspective projection)
    ↓
Determine which pixels the triangle covers
    ↓
For each pixel:
    - Calculate color (from texture, lighting, etc.)
    - Check Z-buffer (is this pixel visible?)
    - Write color and depth
```

**The clever part**: Modern GPUs can rasterize millions of triangles per second because they do it in parallel. While your CPU has 4-16 cores, a GPU has thousands of tiny cores, each working on different pixels simultaneously.

**Why triangles?**
- Simplest polygon (can't be non-planar)
- Always convex (makes math easier)
- Easy to rasterize
- Any complex shape can be built from triangles

Even today, when you see a smooth sphere in a game, it's actually thousands of tiny triangles.

### Ray Tracing: The Physics-Based Approach (1968-present)

While rasterization was becoming the standard for real-time graphics, researchers were exploring a different approach: **ray tracing**.

**The core idea**: Simulate how light actually works.

```
For each pixel on screen:
    1. Shoot a ray from the camera through that pixel into the scene
    2. Find what the ray hits first
    3. At the hit point:
        - Calculate lighting (shoot rays to light sources)
        - Calculate reflections (shoot more rays for mirrors)
        - Calculate refractions (shoot rays through glass)
    4. Accumulate all the light and set the pixel color
```

**Ray tracing is beautiful** because it's physically accurate:
- Perfect reflections (mirrors, water)
- Realistic refraction (glass, water)
- Accurate shadows (just check if a ray reaches the light)
- Global illumination (light bouncing between surfaces)

**The problem**: It's **slow**. Really slow.

To render a single frame with ray tracing in the 1980s took **hours** or even **days**. Even today, with modern GPUs, path tracing (an advanced form of ray tracing) for a complex scene might take seconds per frame.

**Movies vs. Games**:
- **Movies** (Pixar, Disney): Can use ray tracing because they pre-render everything. One frame taking 10 hours? Fine, they're not interactive.
- **Games**: Need 60 frames per second. That's 16.67 milliseconds per frame. Ray tracing every pixel is impossible.

**The modern compromise**: 
- **Rasterization** for the base image (fast, 60+ FPS)
- **Ray tracing** for specific effects (reflections, shadows, global illumination)
- Modern GPUs have dedicated ray tracing hardware (NVIDIA RTX, AMD RDNA 2)

Games like **Cyberpunk 2077** and **Control** use this hybrid approach—rasterization for most rendering, ray tracing for realistic reflections and lighting.

### The Rendering Pipeline: How Modern GPUs Work

Modern GPUs use a standardized pipeline that evolved from these early techniques:

```
1. VERTEX PROCESSING
   - Take 3D vertices (points in space)
   - Apply transformations (move, rotate, scale)
   - Apply camera projection (3D → 2D screen coordinates)

2. RASTERIZATION
   - Determine which pixels each triangle covers
   - Generate "fragments" (potential pixels)

3. FRAGMENT PROCESSING
   - For each fragment:
     * Calculate color (textures, lighting)
     * Apply effects (fog, glow, etc.)
     * Check Z-buffer

4. OUTPUT
   - Write color to framebuffer (the image you see)
   - Write depth to Z-buffer
```

**The beauty**: This pipeline is **programmable**. You write **shaders**—small programs that run on the GPU at different stages:

- **Vertex Shader**: Processes each vertex (position, transformation)
- **Fragment Shader** (also called Pixel Shader): Processes each pixel (color, lighting)

This is why modern games can have such diverse visual styles. The pipeline is the same, but the shaders can do anything: realistic lighting, cartoon shading, pixelated retro looks, etc.

### Graphics APIs: Abstracting the Complexity

Now here's the problem: Every GPU manufacturer (NVIDIA, AMD, Intel, Apple) has different hardware. Different instruction sets, different capabilities, different memory layouts.

Writing code that directly programs a GPU would mean writing it separately for every GPU model. Nightmare.

Enter **Graphics APIs** (Application Programming Interfaces)—they abstract away the hardware differences.

#### The Major Graphics APIs

**1. OpenGL (1992)**
- Created by Silicon Graphics (SGI)
- Cross-platform (Windows, Mac, Linux, mobile)
- The industry standard for decades
- Still widely used, but aging

**How it works**:
```c
// OpenGL code (C/C++)
glBegin(GL_TRIANGLES);
    glVertex3f(0.0, 1.0, 0.0);
    glVertex3f(-1.0, -1.0, 0.0);
    glVertex3f(1.0, -1.0, 0.0);
glEnd();
```

You tell OpenGL what to draw, and it figures out how to do it on your specific GPU.

**2. DirectX (1995)**
- Created by Microsoft
- Windows and Xbox only
- De facto standard for PC gaming
- Very mature and highly optimized

DirectX includes much more than graphics (audio, input, networking), but **Direct3D** is the graphics component.

**3. Metal (2014)**
- Created by Apple
- iOS, macOS only
- Lower-level access than OpenGL
- Better performance on Apple devices

**4. Vulkan (2016)**
- Created by Khronos Group (same organization as OpenGL)
- Modern, low-level API
- Cross-platform (Windows, Linux, Android)
- Gives more control but is more complex

**The web's solution: WebGL and WebGPU**

For web browsers, we can't use DirectX (Windows-only) or Metal (Apple-only). We need cross-platform APIs.

**WebGL (2011)**:
- Based on OpenGL ES (the mobile version of OpenGL)
- Works in all modern browsers
- Gives JavaScript access to the GPU
- This is what we'll use via Three.js

**WebGPU (2023, emerging)**:
- Modern replacement for WebGL
- Based on modern APIs (Vulkan, Metal, Direct3D 12)
- Better performance and features
- Still being rolled out

### Why We Use Three.js Instead of Raw WebGL

Here's the dirty secret: **raw WebGL code is brutally verbose and error-prone**.

To draw a single colored triangle in pure WebGL requires:
- ~100 lines of JavaScript
- Writing vertex and fragment shaders in GLSL
- Manually managing buffers, uniforms, attributes
- Handling matrix transformations yourself
- One typo = black screen with no error message

**Example of raw WebGL** (just setting up a shader):
```javascript
// Compile vertex shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
}

// Compile fragment shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
}

// Link shaders into program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// ... and we haven't even drawn anything yet!
```

**The same thing in Three.js**:
```javascript
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
```

Three.js handles:
- All the WebGL boilerplate
- Shader compilation and linking
- Buffer management
- Matrix math (transformations, projections)
- Common materials and lighting models
- Asset loading (textures, models)
- Scene graph management

**We're not avoiding learning**—we're learning at the right level. You wouldn't learn to drive by first learning how to build an engine. Three.js lets us focus on game engine concepts (scene management, game loops, components) without drowning in WebGL minutiae.

Later, when you need custom shaders or optimizations, you can drop down to raw WebGL. But for building a game engine, Three.js is the perfect foundation.

### The Coordinate Systems

Before we write code, we need to understand how 3D space works in computer graphics.

#### World Space
The 3D space where your game world exists. Units can be whatever you want (meters, kilometers, etc.), but consistency is key.

```
       Y (up)
       |
       |
       +----- X (right)
      /
     /
    Z (forward, toward camera in OpenGL)
```

**Note**: Different APIs use different conventions:
- **OpenGL/WebGL**: Z+ is toward you, Z- is away (right-handed)
- **DirectX**: Z+ is away from you (left-handed)
- Three.js uses the OpenGL convention

#### View Space (Camera Space)
The world transformed so that the camera is at the origin (0,0,0) looking down the -Z axis.

#### Clip Space
After perspective projection, coordinates are normalized to a cube from -1 to +1 in all dimensions. This is where clipping (removing off-screen geometry) happens.

#### Screen Space
The final 2D coordinates mapped to your screen pixels.

**The transformation pipeline**:
```
Vertex (world space)
    ↓ Model Matrix (position, rotation, scale)
Model Space
    ↓ View Matrix (camera position and orientation)
View Space
    ↓ Projection Matrix (perspective or orthographic)
Clip Space
    ↓ Viewport Transform
Screen Space (pixels)
```

Don't worry if this seems abstract—Three.js handles most of this for you. But understanding the pipeline helps when debugging why something isn't rendering correctly.

## The Mathematics of 3D: Vectors, Transforms, and Movement

Before we implement our renderer, we need to understand the mathematics that power 3D graphics. Don't worry—we'll build these concepts from the ground up, and every formula will have a practical application.

### Why Math Matters in Game Engines

Every time you move a character, rotate a camera, or calculate a collision, you're using **linear algebra**—specifically vectors and matrices. Game engines are fundamentally mathematical machines that transform numbers into visual experiences.

The good news: **Three.js handles most of the complex math for us**. But understanding what's happening under the hood will make you a better engine programmer.

### Vectors: The Building Blocks of 3D

A **vector** is just a direction and magnitude. Think of it as an arrow pointing from one place to another.

#### Vector Basics

In 3D space, a vector has three components:
```
v = (x, y, z)
```

**Examples**:
- Position: `(5, 10, 3)` means "5 units right, 10 units up, 3 units forward"
- Velocity: `(2, 0, 0)` means "moving right at 2 units per second"
- Direction: `(0, 1, 0)` means "pointing straight up"

#### Vector Operations

**Addition**: Combine two vectors
```
a = (1, 2, 3)
b = (4, 5, 6)
a + b = (1+4, 2+5, 3+6) = (5, 7, 9)
```

**Use case**: Adding velocity to position to move an object.

**Subtraction**: Find the vector between two points
```
a = (10, 5, 0)
b = (3, 2, 0)
a - b = (7, 3, 0)  ← Direction from b to a
```

**Use case**: Calculate which direction an enemy should face to look at the player.

**Scaling**: Multiply by a number
```
v = (1, 2, 3)
v * 2 = (2, 4, 6)
```

**Use case**: Make something move twice as fast.

**Magnitude (Length)**: How long is the vector?
```
v = (3, 4, 0)
|v| = √(3² + 4² + 0²) = √25 = 5
```

**Use case**: Calculate distance between two points.

**Normalization**: Make a vector length 1 (unit vector)
```
v = (3, 4, 0)
normalized = v / |v| = (3/5, 4/5, 0) = (0.6, 0.8, 0)
```

**Use case**: Get a pure direction without magnitude.

**Dot Product**: How much two vectors point in the same direction
```
a = (1, 2, 3)
b = (4, 5, 6)
a · b = 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
```

**Special property**: `a · b = |a| |b| cos(θ)` where θ is the angle between them.

**Use case**: 
- Check if something is in front of or behind you
- Calculate lighting intensity (angle between surface and light)

**Cross Product**: Find a vector perpendicular to two vectors
```
a = (1, 0, 0)
b = (0, 1, 0)
a × b = (0, 0, 1)  ← Perpendicular to both
```

**Use case**: 
- Calculate surface normals
- Determine which side of a plane something is on

### Coordinate Spaces and Transformations

Understanding coordinate spaces is crucial. The same object exists in multiple coordinate systems simultaneously:

**Local Space (Object Space)**
- Origin is the object's center
- Example: A car's steering wheel is at `(0, 1, 0.5)` relative to the car

**World Space**
- Origin is the scene's center
- Example: The car is at `(100, 0, 50)` in the world

**View Space (Camera Space)**
- Origin is the camera
- The world transformed as if the camera is at `(0, 0, 0)` looking down -Z

**The transformation chain**:
```
Local Space → World Space → View Space → Clip Space → Screen Space
```

Three.js handles this automatically, but when you're debugging why something renders incorrectly, understanding this chain is essential.

### Matrices: The Transformation Machines

A **matrix** is a grid of numbers that represents a transformation. In 3D graphics, we use **4×4 matrices** for transformations.

**Why 4×4 instead of 3×3?**
- The extra dimension allows us to represent translation (movement)
- This is called **homogeneous coordinates**
- It lets us combine translation, rotation, and scaling in one matrix

#### The Three Fundamental Transformations

**Translation (Movement)**
```
Move by (tx, ty, tz):

| 1  0  0  tx |
| 0  1  0  ty |
| 0  0  1  tz |
| 0  0  0  1  |
```

**Scaling**
```
Scale by (sx, sy, sz):

| sx  0   0  0 |
| 0  sy   0  0 |
| 0   0  sz  0 |
| 0   0   0  1 |
```

**Rotation** (around Z-axis by angle θ)
```
| cos(θ)  -sin(θ)  0  0 |
| sin(θ)   cos(θ)  0  0 |
| 0        0       1  0 |
| 0        0       0  1 |
```

**The magic**: You can combine transformations by multiplying matrices:
```
FinalTransform = Translation × Rotation × Scale
```

**Important**: Order matters! `Rotation × Translation ≠ Translation × Rotation`

Three.js's `Object3D` (which all renderable objects inherit from) has a `matrix` property that combines all these transformations.

### Quaternions: Smooth Rotations Without Gimbal Lock

Representing rotations as matrices works, but has problems:

1. **Gimbal lock**: At certain angles, you lose a degree of freedom
2. **Interpolation**: Interpolating between rotation matrices doesn't give smooth results
3. **Storage**: 9 numbers (3×3 rotation matrix) is wasteful

**Quaternions** solve these problems. A quaternion is four numbers `(x, y, z, w)` that represent a rotation.

**You don't need to understand the math** (it involves complex numbers and 4D space). Just know:
- Quaternions avoid gimbal lock
- They interpolate smoothly (slerp - spherical linear interpolation)
- They're more efficient

Three.js uses quaternions internally. When you set `object.rotation`, it converts to a quaternion behind the scenes.

### Delta Time: Frame-Independent Movement

Remember from Chapter 1: **delta time** is the time since the last frame.

**Why it matters**:

**Bad approach** (frame-dependent):
```typescript
position.x += 5;  // Moves 5 units per frame
```

At 60 FPS: 300 units/second
At 30 FPS: 150 units/second  
**The game runs at different speeds on different computers!**

**Good approach** (frame-independent):
```typescript
const speed = 300;  // units per second
position.x += speed * deltaTime;  // deltaTime is in seconds
```

At 60 FPS: deltaTime ≈ 0.0167s → moves 5 units
At 30 FPS: deltaTime ≈ 0.0333s → moves 10 units  
**Same distance per second regardless of frame rate!**

### Interpolation: Smooth Transitions

**Lerp** (Linear Interpolation): Move smoothly between two values.

```typescript
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

// t=0 → returns start
// t=1 → returns end  
// t=0.5 → returns middle
```

**Use cases**:
- Smooth camera movement
- Fade effects
- Smooth following (camera following player)

**Vector lerp**:
```typescript
function lerpVector(a: Vector3, b: Vector3, t: number): Vector3 {
    return new Vector3(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
    );
}
```

**Slerp** (Spherical Linear Interpolation): Lerp for rotations (quaternions).

```typescript
// Three.js provides this
quaternionA.slerp(quaternionB, t);
```

**Why not regular lerp for rotations?**
- Lerp between rotation matrices doesn't maintain rotation properties
- Slerp moves along the surface of a sphere, giving natural rotation

**Exponential smoothing** (for smooth following):
```typescript
// Makes something gradually approach a target
currentValue += (targetValue - currentValue) * smoothFactor * deltaTime;
```

**Example**: Camera smoothly following a moving player.

### Understanding the Scene Graph

The **scene graph** is a tree structure that organizes your game world.

```
Scene (root)
├── Camera
├── Light (DirectionalLight)
├── Ground (Plane mesh)
└── Player (Group)
    ├── Body (Cube mesh)
    ├── Head (Sphere mesh)
    └── Weapon (Group)
        ├── Handle (Cylinder mesh)
        └── Blade (Box mesh)
```

**Key concepts**:

1. **Hierarchy**: Children inherit transformations from parents
   - If you move the Player, the Body, Head, and Weapon all move together
   - If you rotate the Weapon group, both Handle and Blade rotate

2. **Local vs. World Coordinates**:
   - **Local**: Position relative to parent
   - **World**: Absolute position in the scene
   - Three.js handles the conversion

3. **Scene as Container**:
   - Everything you want to render must be added to the scene
   - The scene is what the camera "sees"

### Cameras: Defining Your Viewpoint

A camera determines what part of the 3D world appears on your 2D screen.

#### Perspective Camera
Mimics how human eyes see—objects farther away appear smaller.

```
Parameters:
- FOV (Field of View): How wide the view is (typically 45-75 degrees)
- Aspect Ratio: Width/height of the viewport
- Near Plane: Closest distance that's visible
- Far Plane: Farthest distance that's visible
```

**Real-world analogy**: It's like looking through a camera lens. Wide FOV = wide-angle lens. Narrow FOV = telephoto lens.

#### Orthographic Camera
No perspective distortion—objects are the same size regardless of distance. Used for 2D games, UI, technical drawings.

**For 3D games, we almost always use perspective cameras.**

### Lighting: Bringing Your Scene to Life

Without lighting, 3D objects look flat. Lighting creates depth and realism.

#### Types of Lights

**1. Ambient Light**
- Illuminates everything equally from all directions
- No shadows, no directionality
- Think of it as "base brightness" or "room lighting"
- Prevents completely black areas

```javascript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // white, 50% intensity
```

**2. Directional Light**
- Parallel rays from one direction (like the sun)
- Has position and target, but rays don't spread
- Casts shadows
- Position only affects shadow calculations, not light direction

```javascript
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7.5);
```

**3. Point Light**
- Emits light in all directions from a point (like a light bulb)
- Intensity decreases with distance
- Casts shadows

**4. Spot Light**
- Cone of light from a point (like a flashlight)
- Has direction and angle
- Casts shadows

For our first implementation, we'll use ambient + directional lighting—the most common combination for outdoor scenes.

### Materials: How Surfaces Respond to Light

A **material** defines how a surface looks: its color, how shiny it is, whether it glows, etc.

#### Common Material Types

**MeshBasicMaterial**
- Not affected by lights
- Flat color or texture
- Good for debugging or UI elements

**MeshLambertMaterial**
- Diffuse reflection (matte surfaces)
- Affected by lights
- Non-shiny (wood, stone, fabric)
- Fast to render

**MeshPhongMaterial**
- Diffuse + specular reflection
- Can be shiny (plastic, metal)
- More expensive than Lambert

**MeshStandardMaterial**
- Physically-based rendering (PBR)
- Metalness and roughness parameters
- Most realistic
- Used in modern games

For learning, we'll start with `MeshPhongMaterial` as it provides good visual feedback without being too complex.

## What We're Building

In this chapter, we'll transform our 2D canvas into a 3D renderer. We'll:

1. Initialize Three.js with a scene, camera, and renderer
2. Create a 3D cube with geometry and material
3. Add lighting to see depth
4. Rotate the cube smoothly
5. Handle window resizing properly

**Deliverable**: A rotating colored cube with lighting on screen.

This will replace our pulsing circle with actual 3D graphics, setting the foundation for everything that follows.

## Setting Up Three.js

We already installed Three.js in Chapter 1, so we're ready to go. Let's create a new rendering system.

### Project Structure

We'll add a new `rendering` folder to organize our graphics code:

```
chapter2/
├── src/
│   ├── core/
│   │   └── Engine.ts
│   ├── rendering/
│   │   └── Renderer.ts          ← New
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

This separation is important: the `Engine` manages the game loop and lifecycle, while `Renderer` handles all graphics.

## Implementation

### The Renderer Class

Create `src/rendering/Renderer.ts`:

```typescript
import * as THREE from 'three';

/**
 * Manages the Three.js renderer, scene, camera, and rendering pipeline.
 */
export class Renderer {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    
    // Test objects (we'll remove these in later chapters)
    private cube: THREE.Mesh | null = null;
    private rotationSpeed: number = 1.0; // radians per second

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,  // Smooth edges
            alpha: false      // Opaque background
        });
        
        // Set initial size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio); // Handle retina displays
        
        // Set background color
        this.renderer.setClearColor(0x1a1a1a, 1.0); // Dark gray, fully opaque
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        const fov = 75; // Field of view in degrees
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1; // Near clipping plane
        const far = 1000; // Far clipping plane
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        
        // Position camera
        this.camera.position.z = 5; // Move camera back so we can see objects at origin
        
        // Initialize test scene
        this.initializeTestScene();
        
        console.log('🎨 Renderer initialized');
        console.log(`WebGL Version: ${this.renderer.capabilities.version}`);
    }
    
    /**
     * Create a test scene with a cube and lights
     * This will be replaced in later chapters with a proper scene system
     */
    private initializeTestScene(): void {
        // Create a cube
        const geometry = new THREE.BoxGeometry(2, 2, 2); // width, height, depth
        
        // Create a material with color
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ff00,      // Green
            shininess: 100,       // How shiny (0-100+)
            specular: 0x444444    // Specular highlight color
        });
        
        // Combine geometry and material into a mesh
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
        
        // Add ambient light (soft overall illumination)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // white, 50% intensity
        this.scene.add(ambientLight);
        
        // Add directional light (like sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // white, full intensity
        directionalLight.position.set(5, 10, 7.5); // Position it above and to the side
        this.scene.add(directionalLight);
        
        console.log('✨ Test scene created: 1 cube, 2 lights');
    }
    
    /**
     * Update scene (called every frame)
     * @param deltaTime Time since last frame in seconds
     */
    public update(deltaTime: number): void {
        // Rotate the cube
        if (this.cube) {
            // Rotate on multiple axes for interesting motion
            this.cube.rotation.x += this.rotationSpeed * deltaTime;
            this.cube.rotation.y += this.rotationSpeed * deltaTime * 0.7; // Slightly different speed
        }
    }
    
    /**
     * Render the current frame
     */
    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Handle window resize
     */
    public onResize(width: number, height: number): void {
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix(); // Must call this after changing camera properties
        
        // Update renderer size
        this.renderer.setSize(width, height);
        
        console.log(`📐 Renderer resized to ${width}x${height}`);
    }
    
    /**
     * Get the Three.js scene (for adding objects later)
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }
    
    /**
     * Get the Three.js camera (for manipulation later)
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        console.log('🗑️  Renderer disposed');
    }
}
```

**Let's break down what this code does:**

#### Constructor
1. **WebGLRenderer**: Creates the connection to WebGL
   - `antialias: true`: Smooths jagged edges (uses more GPU power but looks better)
   - `alpha: false`: Opaque background (slightly faster)
   - `setPixelRatio()`: Handles high-DPI displays (Retina, 4K, etc.)

2. **Scene**: Container for all 3D objects

3. **PerspectiveCamera**: Defines our viewpoint
   - FOV: 75° is a good default (not too wide, not too narrow)
   - Aspect ratio: width/height of the viewport
   - Near/far planes: Only render objects between 0.1 and 1000 units away

#### Test Scene
Creates a simple scene to verify everything works:
- A green cube (2x2x2 units)
- Ambient light (base illumination)
- Directional light (creates shadows and depth)

#### Update Method
Rotates the cube based on delta time—this ensures smooth rotation regardless of frame rate.

#### Render Method
Tells Three.js to render the scene from the camera's perspective.

#### Resize Handler
Updates camera and renderer when the window resizes. **Important**: You must call `updateProjectionMatrix()` after changing camera properties.

### Updating the Engine

Now we need to integrate our new renderer into the engine. Update `src/core/Engine.ts`:

```typescript
import { Renderer } from '../rendering/Renderer';

/**
 * The core game engine class.
 * Manages the game loop, timing, and lifecycle.
 */
export class Engine {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private deltaTime: number = 0;
    private fps: number = 0;
    private frameCount: number = 0;
    private fpsUpdateTime: number = 0;
    private startTime: number = 0;
    private runTime: number = 0;
    
    // DOM elements for stats display
    private fpsElement: HTMLElement | null;
    private frametimeElement: HTMLElement | null;
    private runtimeElement: HTMLElement | null;

    constructor(canvasId: string = 'game-canvas') {
        // Get the canvas element
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;
        
        // Create renderer
        this.renderer = new Renderer(this.canvas);
        
        // Get stats display elements
        this.fpsElement = document.getElementById('fps');
        this.frametimeElement = document.getElementById('frametime');
        this.runtimeElement = document.getElementById('runtime');
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        
        console.log('🎮 Game Engine initialized');
    }
    
    /**
     * Handle window resize
     */
    private onResize(): void {
        this.renderer.onResize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Start the game loop
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Engine is already running');
            return;
        }
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        this.fpsUpdateTime = this.startTime;
        
        console.log('▶️  Engine started');
        
        // Start the game loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    /**
     * Stop the game loop
     */
    public stop(): void {
        this.isRunning = false;
        console.log('⏸️  Engine stopped');
    }
    
    /**
     * The main game loop - runs every frame
     */
    private gameLoop(timestamp: number): void {
        if (!this.isRunning) {
            return;
        }
        
        // Calculate delta time (time since last frame)
        this.deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = timestamp;
        
        // Calculate runtime
        this.runTime = (timestamp - this.startTime) / 1000;
        
        // Update FPS counter every second
        this.frameCount++;
        const timeSinceFpsUpdate = timestamp - this.fpsUpdateTime;
        if (timeSinceFpsUpdate >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / timeSinceFpsUpdate);
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
            
            // Update display
            this.updateStats();
        }
        
        // === THE GAME LOOP ===
        this.processInput();
        this.update(this.deltaTime);
        this.render();
        // =====================
        
        // Schedule next frame
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
    
    /**
     * Process input (keyboard, mouse, touch)
     * Called every frame before update
     */
    private processInput(): void {
        // In future chapters, we'll implement input handling here
    }
    
    /**
     * Update game state
     * Called every frame
     */
    private update(deltaTime: number): void {
        // Update the renderer (this will rotate our cube)
        this.renderer.update(deltaTime);
        
        // Log every 60 frames (roughly once per second at 60 FPS)
        if (this.frameCount % 60 === 0) {
            console.log(`Update - DeltaTime: ${(deltaTime * 1000).toFixed(2)}ms, Runtime: ${this.runTime.toFixed(2)}s`);
        }
    }
    
    /**
     * Render the current frame
     * Called every frame after update
     */
    private render(): void {
        this.renderer.render();
    }
    
    /**
     * Update the stats display
     */
    private updateStats(): void {
        if (this.fpsElement) {
            this.fpsElement.textContent = this.fps.toString();
        }
        if (this.frametimeElement) {
            this.frametimeElement.textContent = (this.deltaTime * 1000).toFixed(2);
        }
        if (this.runtimeElement) {
            this.runtimeElement.textContent = this.runTime.toFixed(1);
        }
    }
    
    /**
     * Get current FPS
     */
    public getFPS(): number {
        return this.fps;
    }
    
    /**
     * Get current delta time
     */
    public getDeltaTime(): number {
        return this.deltaTime;
    }
    
    /**
     * Check if engine is running
     */
    public getIsRunning(): boolean {
        return this.isRunning;
    }
    
    /**
     * Get the renderer
     */
    public getRenderer(): Renderer {
        return this.renderer;
    }
    
    /**
     * Clean up resources
     */
    public dispose(): void {
        this.renderer.dispose();
    }
}
```

**Key changes from Chapter 1:**

1. **Removed 2D canvas rendering** - No more `getContext('2d')`
2. **Added Renderer** - Created in constructor, called in update/render
3. **Delegated resizing** - Calls `renderer.onResize()` instead of handling it directly
4. **Cleaner separation** - Engine manages the loop, Renderer manages graphics

### The Entry Point

Update `src/main.ts`:

```typescript
import { Engine } from './core/Engine';

/**
 * Entry point for the game engine
 */

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 2');
console.log('The Rendering Foundation');
console.log('='.repeat(50));

// Create and start the engine
const engine = new Engine('game-canvas');
engine.start();

// Make engine accessible from browser console for debugging
(window as any).engine = engine;

console.log('💡 Tip: Access the engine from console with "window.engine"');
console.log('💡 Try: window.engine.stop() or window.engine.start()');
console.log('💡 Try: window.engine.getRenderer().getCamera().position.z = 10');
```

## Building Math Utilities

Now let's create the mathematical foundation that will make working with 3D objects much easier. We'll build utility classes for common operations.

### The Math Utility Module

Create `src/math/MathUtils.ts`:

```typescript
/**
 * Common mathematical utilities for game development
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param start Starting value
 * @param end Ending value
 * @param t Interpolation factor (0 to 1)
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Inverse lerp - find the t value for a given value between start and end
 */
export function inverseLerp(start: number, end: number, value: number): number {
    return (value - start) / (end - start);
}

/**
 * Remap a value from one range to another
 */
export function remap(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
    const t = inverseLerp(fromMin, fromMax, value);
    return lerp(toMin, toMax, t);
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Smooth step function (smooths interpolation at edges)
 */
export function smoothStep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Check if two numbers are approximately equal (within epsilon)
 */
export function approximately(a: number, b: number, epsilon: number = 0.0001): boolean {
    return Math.abs(a - b) < epsilon;
}

/**
 * Wrap a value to a range (like modulo but works correctly with negatives)
 */
export function wrap(value: number, min: number, max: number): number {
    const range = max - min;
    return min + ((((value - min) % range) + range) % range);
}

/**
 * Exponential decay - useful for smooth following
 */
export function exponentialDecay(a: number, b: number, decay: number, deltaTime: number): number {
    return b + (a - b) * Math.exp(-decay * deltaTime);
}
```

These are the fundamental math operations you'll use constantly. Let's see some examples:

```typescript
// Clamp a value to a range
const health = clamp(damage - armor, 0, 100); // Keep between 0-100

// Interpolate smoothly
const currentPos = lerp(startPos, endPos, 0.5); // Halfway between

// Convert angles
const radians = degToRad(90); // 90 degrees to radians

// Smooth movement
const smoothPos = exponentialDecay(current, target, 5.0, deltaTime);
```

### Vector3 Utility Functions

Create `src/math/Vector3Utils.ts`:

```typescript
import * as THREE from 'three';
import { lerp } from './MathUtils';

/**
 * Utility functions for Vector3 operations
 */

/**
 * Linear interpolation between two vectors
 */
export function lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
    );
}

/**
 * Exponential decay for vectors
 */
export function exponentialDecayVector3(
    current: THREE.Vector3,
    target: THREE.Vector3,
    decay: number,
    deltaTime: number
): THREE.Vector3 {
    const diff = target.clone().sub(current);
    return current.clone().add(diff.multiplyScalar(1 - Math.exp(-decay * deltaTime)));
}

/**
 * Calculate the angle between two vectors in degrees
 */
export function angleBetween(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.acos(a.dot(b) / (a.length() * b.length())) * (180 / Math.PI);
}

/**
 * Project vector a onto vector b
 */
export function projectOnto(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    const bNormalized = b.clone().normalize();
    return bNormalized.multiplyScalar(a.dot(bNormalized));
}

/**
 * Reflect a vector off a surface with the given normal
 */
export function reflect(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    return vector.clone().sub(
        normal.clone().multiplyScalar(2 * vector.dot(normal))
    );
}

/**
 * Check if two vectors are approximately equal
 */
export function approximatelyEqual(a: THREE.Vector3, b: THREE.Vector3, epsilon: number = 0.0001): boolean {
    return Math.abs(a.x - b.x) < epsilon &&
           Math.abs(a.y - b.y) < epsilon &&
           Math.abs(a.z - b.z) < epsilon;
}

/**
 * Get a random point within a sphere
 */
export function randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(Math.random()) * radius;
    
    return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
    );
}

/**
 * Get a random point on the surface of a sphere
 */
export function randomOnSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
    );
}
```

These vector utilities will be essential for things like:
- Smooth camera following (`exponentialDecayVector3`)
- Bouncing objects off surfaces (`reflect`)
- Calculating if an enemy is facing you (`angleBetween`)
- Particle effects (`randomInSphere`)

### Transform Helper Class

Create `src/math/Transform.ts`:

```typescript
import * as THREE from 'three';

/**
 * Transform class - encapsulates position, rotation, and scale
 * This will later become a component, but for now it's a utility class
 */
export class Transform {
    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public scale: THREE.Vector3;
    
    // Link to a Three.js object
    private object3D: THREE.Object3D | null = null;

    constructor(position?: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3) {
        this.position = position ? position.clone() : new THREE.Vector3(0, 0, 0);
        this.rotation = rotation ? rotation.clone() : new THREE.Euler(0, 0, 0);
        this.scale = scale ? scale.clone() : new THREE.Vector3(1, 1, 1);
    }
    
    /**
     * Link this transform to a Three.js Object3D
     */
    public linkToObject3D(object: THREE.Object3D): void {
        this.object3D = object;
        this.syncToObject3D();
    }
    
    /**
     * Sync our transform values to the linked Object3D
     */
    public syncToObject3D(): void {
        if (this.object3D) {
            this.object3D.position.copy(this.position);
            this.object3D.rotation.copy(this.rotation);
            this.object3D.scale.copy(this.scale);
        }
    }
    
    /**
     * Sync from the linked Object3D to our transform values
     */
    public syncFromObject3D(): void {
        if (this.object3D) {
            this.position.copy(this.object3D.position);
            this.rotation.copy(this.object3D.rotation);
            this.scale.copy(this.object3D.scale);
        }
    }
    
    /**
     * Translate (move) by a vector
     */
    public translate(translation: THREE.Vector3): void {
        this.position.add(translation);
        this.syncToObject3D();
    }
    
    /**
     * Rotate by euler angles (in radians)
     */
    public rotate(rotation: THREE.Euler): void {
        this.rotation.x += rotation.x;
        this.rotation.y += rotation.y;
        this.rotation.z += rotation.z;
        this.syncToObject3D();
    }
    
    /**
     * Look at a target position
     */
    public lookAt(target: THREE.Vector3): void {
        if (this.object3D) {
            this.object3D.lookAt(target);
            this.syncFromObject3D();
        }
    }
    
    /**
     * Get the forward direction (local -Z axis in world space)
     */
    public getForward(): THREE.Vector3 {
        const forward = new THREE.Vector3(0, 0, -1);
        if (this.object3D) {
            forward.applyQuaternion(this.object3D.quaternion);
        }
        return forward.normalize();
    }
    
    /**
     * Get the right direction (local +X axis in world space)
     */
    public getRight(): THREE.Vector3 {
        const right = new THREE.Vector3(1, 0, 0);
        if (this.object3D) {
            right.applyQuaternion(this.object3D.quaternion);
        }
        return right.normalize();
    }
    
    /**
     * Get the up direction (local +Y axis in world space)
     */
    public getUp(): THREE.Vector3 {
        const up = new THREE.Vector3(0, 1, 0);
        if (this.object3D) {
            up.applyQuaternion(this.object3D.quaternion);
        }
        return up.normalize();
    }
    
    /**
     * Clone this transform
     */
    public clone(): Transform {
        return new Transform(this.position, this.rotation, this.scale);
    }
}
```

The Transform class provides a clean interface for manipulating objects. Later, we'll make this a Component, but for now it's a standalone utility.

### Using Math Utilities in the Renderer

Let's update the Renderer to demonstrate these math utilities. Modify the beginning of `src/rendering/Renderer.ts`:

```typescript
import * as THREE from 'three';
import { exponentialDecayVector3 } from '../math/Vector3Utils';

/**
 * Manages the Three.js renderer, scene, camera, and rendering pipeline.
 */
export class Renderer {
    // ... existing properties ...
    
    // Add these for smooth camera demo
    private targetCameraPosition: THREE.Vector3;
    private cameraDecayRate: number = 5.0;

    constructor(canvas: HTMLCanvasElement) {
        // ... existing constructor code ...
        
        // Initialize target position to current camera position
        this.targetCameraPosition = this.camera.position.clone();
        
        // ... rest of constructor ...
    }
    
    public update(deltaTime: number): void {
        if (this.cube) {
            this.cube.rotation.x += this.rotationSpeed * deltaTime;
            this.cube.rotation.y += this.rotationSpeed * deltaTime * 0.7;
        }
        
        // Smooth camera movement using exponential decay
        this.camera.position.copy(
            exponentialDecayVector3(
                this.camera.position,
                this.targetCameraPosition,
                this.cameraDecayRate,
                deltaTime
            )
        );
    }
    
    /**
     * Set the target camera position (it will smoothly move there)
     */
    public setCameraTarget(position: THREE.Vector3): void {
        this.targetCameraPosition.copy(position);
    }
    
    // ... rest of the class ...
}
```

Now your camera will smoothly interpolate to new positions instead of jumping instantly!

### Updated Project Structure

Your project should now have this structure:

```
chapter2/
├── src/
│   ├── core/
│   │   └── Engine.ts
│   ├── math/                    ← New!
│   │   ├── MathUtils.ts         ← New!
│   │   ├── Vector3Utils.ts      ← New!
│   │   └── Transform.ts         ← New!
│   ├── rendering/
│   │   └── Renderer.ts          (updated)
│   └── main.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Configuration Files

The configuration files remain the same from Chapter 1:

- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration  
- `package.json` - Dependencies and scripts
- `index.html` - HTML entry point

All these files should already exist from Chapter 1. No changes needed!

## Running Your 3D Engine

Time to see it in action!

1. Make sure you're in the `chapter2` directory
2. Run:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in Chrome

You should see:
- A **rotating green cube** in the center
- Lighting that creates depth and shading
- FPS counter showing ~60 FPS
- Smooth rotation that adjusts to your frame rate

**If you see a black screen:**
- Check the browser console for errors
- Make sure Three.js installed correctly (`npm install`)
- Verify the canvas ID matches in HTML and TypeScript

## Understanding What's Happening

Let's trace the rendering pipeline in our code:

### Frame 0 (Initialization)
1. **HTML loads** → Creates canvas element
2. **main.ts executes** → Creates Engine
3. **Engine constructor** → Creates Renderer
4. **Renderer constructor**:
   - Initializes WebGL via Three.js
   - Creates scene (empty container)
   - Creates camera (at z=5, looking at origin)
   - Creates cube (at origin)
   - Adds lights
5. **engine.start()** → Begins the game loop

### Every Frame (60 times per second)
1. **gameLoop()** calculates delta time
2. **processInput()** - empty for now
3. **update()**:
   - Calls `renderer.update(deltaTime)`
   - Renderer rotates the cube based on delta time
4. **render()**:
   - Calls `renderer.render()`
   - Three.js internally:
     * Transforms vertices (world → view → clip → screen)
     * Rasterizes triangles
     * Runs shaders to calculate colors
     * Z-buffer handles depth
     * Outputs to canvas
5. **requestAnimationFrame()** schedules next frame

### Under the Hood (What Three.js Does)

When you call `renderer.render(scene, camera)`, Three.js:

1. **Culling**: Removes objects outside the camera's view frustum
2. **Sorting**: Orders objects (opaque front-to-back, transparent back-to-front)
3. **For each object**:
   - Computes model matrix (position, rotation, scale)
   - Computes view matrix (camera transform)
   - Computes projection matrix (perspective)
   - Combines into MVP matrix (Model-View-Projection)
4. **Sends to GPU**:
   - Vertex data (positions, normals, UVs)
   - Uniform data (matrices, light positions, material properties)
   - Textures (if any)
5. **GPU executes**:
   - Vertex shader transforms each vertex
   - Rasterizer determines which pixels each triangle covers
   - Fragment shader calculates each pixel's color
   - Z-buffer discards hidden pixels
   - Final image written to framebuffer
6. **Browser displays** the framebuffer on screen

All of this happens in ~16 milliseconds (at 60 FPS).

## Experiments to Try

### 1. Change the Cube's Color

In `Renderer.ts`, find the material creation:
```typescript
const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,  // Try 0xff0000 (red), 0x0000ff (blue), 0xffff00 (yellow)
    shininess: 100,
    specular: 0x444444
});
```

### 2. Adjust Rotation Speed

In `Renderer.ts`, change:
```typescript
private rotationSpeed: number = 1.0; // Try 2.0 for faster, 0.5 for slower
```

Or make it rotate on just one axis:
```typescript
public update(deltaTime: number): void {
    if (this.cube) {
        this.cube.rotation.y += this.rotationSpeed * deltaTime; // Only Y axis
    }
}
```

### 3. Move the Camera

Open the browser console and try:
```javascript
window.engine.getRenderer().getCamera().position.z = 10; // Move back
window.engine.getRenderer().getCamera().position.x = 5;  // Move right
window.engine.getRenderer().getCamera().position.y = 3;  // Move up
```

### 4. Change the Cube Size

In `Renderer.ts`:
```typescript
const geometry = new THREE.BoxGeometry(4, 1, 1); // Wide and flat
// or
const geometry = new THREE.BoxGeometry(1, 4, 1); // Tall and thin
```

### 5. Add More Cubes

In `initializeTestScene()`, after creating the first cube:
```typescript
// Create a second cube
const geometry2 = new THREE.BoxGeometry(1, 1, 1);
const material2 = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red
const cube2 = new THREE.Mesh(geometry2, material2);
cube2.position.x = -3; // Position to the left
this.scene.add(cube2);
```

### 6. Change the Light Position

In `initializeTestScene()`:
```typescript
directionalLight.position.set(5, 10, 7.5); // Try different positions
// Example: directionalLight.position.set(-5, -5, -5); // Light from below-left
```

### 7. Try Different Materials

Replace `MeshPhongMaterial` with:
```typescript
// Flat color, no lighting
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

// Matte surface
const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

// PBR (realistic)
const material = new THREE.MeshStandardMaterial({ 
    color: 0x00ff00,
    metalness: 0.5,
    roughness: 0.5
});
```

### 8. Adjust Field of View

In the console:
```javascript
const camera = window.engine.getRenderer().getCamera();
camera.fov = 120; // Wide angle (fish-eye effect)
camera.updateProjectionMatrix();

// or
camera.fov = 20; // Narrow (telephoto effect)
camera.updateProjectionMatrix();
```

### 9. Test Smooth Camera Movement (NEW!)

Open the browser console and try:
```javascript
const renderer = window.engine.getRenderer();
// Move camera smoothly to new position
renderer.setCameraTarget(new THREE.Vector3(10, 5, 10));
// Watch it smoothly interpolate!

// Try different positions
renderer.setCameraTarget(new THREE.Vector3(-5, 10, 5));
renderer.setCameraTarget(new THREE.Vector3(0, 0, 15));
```

### 10. Use Math Utilities (NEW!)

In the console, try these utility functions:
```javascript
import { lerp, clamp, degToRad } from './math/MathUtils.js';

// Interpolate between values
lerp(0, 100, 0.5)  // Returns 50

// Clamp values
clamp(150, 0, 100)  // Returns 100
clamp(-10, 0, 100)  // Returns 0

// Convert angles
degToRad(90)  // Returns ~1.57 (π/2)
```

### 11. Test Vector Operations (NEW!)

```javascript
import { angleBetween, reflect } from './math/Vector3Utils.js';

// Calculate angle between two directions
const forward = new THREE.Vector3(0, 0, -1);
const right = new THREE.Vector3(1, 0, 0);
angleBetween(forward, right);  // Returns 90 degrees

// Reflect a vector off a surface
const incoming = new THREE.Vector3(1, -1, 0).normalize();
const normal = new THREE.Vector3(0, 1, 0);  // Floor pointing up
const bounced = reflect(incoming, normal);
console.log(bounced);  // Shows the bounce direction
```
camera.fov = 20; // Narrow (telephoto effect)
camera.updateProjectionMatrix();
```

## Common Issues and Solutions

**Issue: Cube appears flat/no lighting**
- **Cause**: Missing lights or using `MeshBasicMaterial`
- **Solution**: Ensure you have both ambient and directional lights, use `MeshPhongMaterial`

**Issue: Cube is invisible**
- **Cause**: Camera is inside the cube or cube is behind camera
- **Solution**: Check camera position (should be at z=5) and cube position (should be at origin)

**Issue: Rotation stutters**
- **Cause**: Not using delta time, or frame rate is low
- **Solution**: Ensure rotation uses `deltaTime`, check FPS counter

**Issue: "WebGL not supported" error**
- **Cause**: Old browser or GPU blacklisted
- **Solution**: Update Chrome, try a different browser, check GPU drivers

**Issue: Black screen, no errors**
- **Cause**: Cube outside camera frustum, or near/far planes wrong
- **Solution**: Check camera position and near/far values (0.1 and 1000)

**Issue: Performance is poor (< 30 FPS)**
- **Cause**: Retina display, too many lights, old GPU
- **Solution**: Turn off antialiasing, reduce pixel ratio, simplify scene

## What We've Learned

In this chapter, you've learned:

✅ The history of computer graphics (painter's algorithm, Z-buffer, rasterization, ray tracing)  
✅ How modern GPUs work (rendering pipeline, shaders, parallel processing)  
✅ The evolution of graphics APIs (OpenGL, DirectX, Vulkan, WebGL)  
✅ Why we use Three.js instead of raw WebGL  
✅ 3D coordinate systems and transformations  
✅ The scene graph architecture  
✅ How cameras work (perspective projection)  
✅ Types of lights and materials  
✅ How to initialize Three.js and render 3D objects  
✅ **Vector mathematics and operations** ✨  
✅ **Matrix transformations** ✨  
✅ **Quaternions for smooth rotations** ✨  
✅ **Delta time for frame-independent movement** ✨  
✅ **Interpolation techniques (lerp, exponential decay)** ✨  
✅ **Built comprehensive math utility library** ✨

Most importantly, you've **transformed your engine from 2D to 3D** AND **built the mathematical foundation** for all future movement and physics. You're now rendering actual 3D graphics with lighting, using the same techniques that power AAA games (just abstracted by Three.js).

## What's Next

In Chapter 3, we'll build the **Entity-Component Architecture**:

- GameObject and Component pattern (Unity-style)
- Component lifecycle (Awake, Start, Update, Destroy)
- Component management system
- Making Transform a proper Component
- Creating reusable behaviors

We'll transform our simple rotating cube into a proper game object system where you can attach different behaviors to objects—the foundation of how modern game engines work.

Right now, our cube exists directly in the renderer. After Chapter 3, we'll have GameObjects that can have multiple Components (Transform, Renderer, Physics, Scripts, etc.), making it easy to build complex game entities.

## Exercises

Before moving to Chapter 3, try these challenges:

### Exercise 1: Multiple Colored Cubes
Create 5 cubes in a row, each a different color, each rotating at a different speed.

### Exercise 2: Orbit Camera
Make the camera rotate around the cube in a circle. Hint: use `Math.sin()` and `Math.cos()` for circular motion with delta time.

### Exercise 3: Pulsing Cube
Make the cube grow and shrink smoothly using `scale`. Use `Math.sin()` with runtime, but apply it smoothly using `lerp()` from your math utilities.

### Exercise 4: Light Show
Add multiple colored lights that move around the scene. Make them orbit the cube using circular motion equations.

### Exercise 5: Different Shapes
Replace the cube with other geometries:
- `SphereGeometry`
- `ConeGeometry`
- `TorusGeometry`
- `CylinderGeometry`

Try creating a simple scene (like a snowman) from multiple shapes.

### Exercise 6: Keyboard Control
Add keyboard controls to move the cube:
- Arrow keys to move left/right/up/down
- Q/E to move forward/backward

Use delta time to ensure frame-independent movement. Movement speed should be constant regardless of FPS.

### Exercise 7: Smooth Following Camera (NEW!)
Create a camera that smoothly follows a moving cube. The cube should move in a circular pattern, and the camera should smoothly interpolate to follow it using `exponentialDecayVector3()`.

**Hints**:
- Move the cube in a circle: `position.x = Math.cos(time) * radius`
- Camera target should be cube position + offset
- Use exponential decay for smooth following

### Exercise 8: Bouncing Ball (NEW!)
Create a sphere that bounces realistically:
- Use gravity (constant downward acceleration)
- Use `reflect()` function when it hits the ground
- Apply damping (energy loss) on each bounce

**Hints**:
- Velocity increases with gravity each frame
- When y position < 0, reflect the velocity
- Multiply velocity by 0.8 after each bounce (damping)

### Exercise 9: Math Utilities Practice (NEW!)
Create a color-changing cube:
- Use `lerp()` to smoothly transition between colors
- Use `wrap()` to cycle through color values
- Use `smoothStep()` for ease-in/ease-out effects

**Hints**:
- Colors in Three.js can be set as numbers (0x000000 to 0xffffff)
- Interpolate the red, green, blue components separately
- Update the material color each frame

### Exercise 10: Transform Practice (NEW!)
Create a Transform instance for the cube and use its helper methods:
- Use `getForward()` to move the cube forward
- Use `lookAt()` to make it face the camera
- Use `rotate()` to spin it around different axes

**Bonus**: Create a "turret" that always faces the camera using `lookAt()`.

## Additional Resources

**Three.js Documentation**:
- https://threejs.org/docs/
- https://threejs.org/examples/

**Learning WebGL** (if curious about what Three.js abstracts):
- https://webglfundamentals.org/

**Graphics Programming**:
- "Real-Time Rendering" by Tomas Akenine-Möller (the bible of graphics)
- "Computer Graphics: Principles and Practice" by Foley et al.
- "3D Math Primer for Graphics and Game Development" by Fletcher Dunn

**Mathematics for Games**:
- "Mathematics for 3D Game Programming and Computer Graphics" by Eric Lengyel
- "Game Engine Architecture" by Jason Gregory (covers both rendering and math)

**Interactive Learning**:
- https://www.shadertoy.com/ - Experiment with shaders
- https://learnopengl.com/ - OpenGL tutorial (concepts apply to WebGL)
- https://immersivemath.com/ila/ - Interactive linear algebra

## Final Thoughts

You've crossed a major threshold. You're no longer just drawing pixels—you're rendering 3D worlds with proper lighting and depth, **and you have the mathematical foundation to manipulate them**.

The techniques you're using (scene graphs, cameras, lights, materials, vector math, transforms) are the same techniques used by Unity, Unreal, and every major game engine. The only difference is scale and optimization.

You now understand both the **visual** side (rendering) and the **mathematical** side (transforms, vectors, interpolation) of game engines. Everything that follows builds on these foundations.

In the next chapter, we'll create the **component architecture** that will let us compose complex game objects from simple, reusable parts. This is the pattern that makes Unity and Unreal so powerful.

See you in Chapter 3!

---

**Chapter 2 Complete** ✓

*Deliverable: A rotating colored cube with lighting, plus utility classes for vector math and smooth object movement*