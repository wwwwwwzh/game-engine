# Chapter 1: Introduction to Game Engines

## What Is a Game Engine?
At its core, a **game engine** is a software framework that provides the fundamental building blocks needed to create a game. It handles the repetitive, technical heavy lifting—rendering graphics, playing sounds, detecting collisions, managing input—so you can focus on what makes your game unique: the gameplay, story, and experience.

Think of popular games you've played. Fortnite, Genshin Impact, Hollow Knight—they all run on game engines (Unreal, Unity, and Unity respectively). The engine doesn't make the game fun or beautiful; it makes building that fun, beautiful game *possible* without reinventing the wheel.

> If you are a programmer, it's like using a code editor with packages in a high level language instead of using a basic text editor and writing repetitive codes in C or even assembly. The engine abstracts lots of functionalities into easy to use tools. In addition, games are visual, and require lots of visual editing. The engine needs to handle the complex game building logic into a clear visual interface. You can think of comfyui as between a game engine and a code editor.  

## A Brief History: From Doom to Modern Engines

### The Early Days: The Platform Wars (1980s-1990s)

Before we talk about engines, we need to understand the battlefield: the platforms.

In the 1980s and early 1990s, games were built for **specific hardware**. When you made a game for the **Nintendo Entertainment System (NES)**, you wrote code in 6502 assembly language that spoke directly to Nintendo's custom chips. That same code was utterly useless on a **Sega Genesis**, which used a completely different Motorola 68000 processor.

Meanwhile, **PC gaming** (MS-DOS on IBM-compatible computers) was the wild west. Every PC had different graphics cards, sound cards, and processors. Developers had to write separate code paths for:
- VGA, EGA, CGA, or Hercules graphics
- Sound Blaster, AdLib, or PC Speaker audio
- Different CPU speeds (386, 486, Pentium)

**Mac gaming** existed but was niche. Apple's Macintosh computers were expensive and primarily marketed for creative work, not gaming. Most game developers ignored the Mac because:
1. Small market share (under 5% in the 1990s)
2. Different processor architecture (Motorola 68k, later PowerPC)
3. Apple's focus on productivity software, not games

Each platform was an island. If you wanted your game on multiple platforms, you essentially built it multiple times.

### The GPU Revolution (Mid-1990s)

Then something transformative happened: **dedicated graphics processors** emerged.

Before GPUs, the CPU did everything—game logic, physics, and drawing every single pixel. This was incredibly limiting. Then in 1995, companies like **3dfx** (with the Voodoo card) and **NVIDIA** introduced consumer 3D accelerators.

**What GPUs changed:**

1. **Parallel Processing**: While a CPU has a few cores optimized for sequential tasks, a GPU has thousands of tiny cores optimized for doing the same operation on massive amounts of data simultaneously. Perfect for graphics!

2. **Hardware Acceleration**: Instead of the CPU calculating and drawing every triangle, the GPU could handle millions of triangles per second using dedicated silicon.

3. **Fixed-Function to Programmable**: Early GPUs had a fixed pipeline—you could only do what the hardware allowed. By the early 2000s, **programmable shaders** arrived. Developers could now write custom code (shaders) that ran on the GPU, enabling unprecedented visual effects.

**The PC Advantage**: While consoles had fixed hardware, PC gamers could upgrade their graphics cards. This created a performance ladder—the same game could look basic on integrated graphics or stunning on a high-end GPU.

This is when PC gaming truly differentiated itself from consoles: **scalable graphics**. The same game binary could run on a range of hardware by adjusting settings.

### Doom and the Birth of Game Engines (1993)

Into this fragmented landscape came **Doom**. id Software released it for MS-DOS in 1993, and while it wasn't the first game with reusable code, it popularized the concept.

Doom's code was organized in layers:
- **Rendering engine**: Drew the 3D world
- **Game logic**: Monsters, items, weapons
- **WAD files**: All assets (levels, textures, sounds) in external files

This separation wasn't just good engineering—it was **necessary**. id Software was a small team and needed to reuse code. But it had a side effect: other developers could license the "Doom engine" and build their own games by swapping out the WAD files and modifying the game logic.

**Platform Reality**: Doom was PC-only initially. Porting to other platforms (like the Super Nintendo or PlayStation) required complete rewrites because:
- Different CPUs (x86 vs. custom console chips)
- Different memory architectures
- No GPU—consoles used custom graphics chips

This is why early game engines were often **platform-specific**.

### The DirectX Revolution (Mid-1990s)

Microsoft saw the platform fragmentation problem and did something bold. In 1995, they released **DirectX**—a set of APIs that abstracted hardware differences on Windows PCs.

**Before DirectX**: Your game needed separate code for each graphics card brand.
**After DirectX**: Write to DirectX once, and it worked on any DirectX-compatible GPU.

This was huge. It made PC game development viable without shipping a phonebook-sized manual of supported hardware configurations.

**OpenGL** (created by Silicon Graphics in 1992) played a similar role on workstations and eventually Mac/Linux, but it was more complex and geared toward professional 3D graphics.

Nintendo, Sony, and Sega didn't need this abstraction—they controlled their hardware completely and provided proprietary SDKs (Software Development Kits).

### The 2000s: The Engine Wars and Cross-Platform Dreams

By the 2000s, engines became products in their own right. **Unreal Engine** (1998) and **CryEngine** (2002) showcased cutting-edge graphics and, crucially, began handling **cross-platform compilation**.

**The Cross-Platform Challenge**:

Building a game for multiple platforms meant dealing with:

1. **Different CPUs**: 
   - PC: x86/x86-64 (Intel, AMD)
   - Mac: PowerPC (until 2006), then Intel x86
   - Xbox: Custom x86
   - PlayStation 2/3: Custom processors (Emotion Engine, Cell)
   - Nintendo GameCube/Wii: PowerPC

2. **Different Graphics APIs**:
   - PC: DirectX (Windows only)
   - Mac: OpenGL
   - Consoles: Proprietary APIs (libgcm for PS3, GX for GameCube)

3. **Different Development Tools**:
   - PC: Visual Studio
   - Mac: Xcode
   - Consoles: Proprietary SDKs with strict NDAs

**The Engine Solution**: Engines like Unreal abstracted these differences. You wrote game logic once, and the engine handled the platform-specific code. But this was expensive—Unreal Engine cost hundreds of thousands in licensing fees.

Most indie developers couldn't afford it. They were stuck either:
- Building for one platform only (usually Windows)
- Writing platform-specific code themselves
- Or not making games at all

### The 2010s: Unity's Gambit and the Mac Connection
[Unity 1.0 screenshots](https://discussions.unity.com/t/how-unity-1-looked-back-in-2005/484169/19)

Then came **Unity** in 2005, and here's where the Mac story gets interesting.

**Why Unity Chose Mac**:

Unity was founded by three developers in Denmark who loved Macs. But there was a strategic genius to this:

1. **Less Competition**: Most game engines focused on Windows. By targeting Mac first, Unity had a niche market with desperate developers—Mac game development was painful.

2. **Apple's Developer Culture**: Mac developers were used to paying for quality tools. Unity could establish a business model.

3. **Cross-Platform from Day One**: Unity's founders knew that Mac-only wouldn't sustain them. They built cross-platform support into the DNA of the engine from the beginning.

4. **The iPhone Changed Everything (2007)**: When Apple launched the iPhone, Unity was already Mac-native with an existing relationship with Apple. They were perfectly positioned to support iOS game development. This was the real goldmine.

**The Technical Approach**:

Unity solved the platform problem elegantly:
- **Single Scripting Language**: You write C# (or JavaScript/Boo initially)
- **Abstraction Layer**: Unity translates your code and assets to each platform
- **Built-in Solutions**: Cross-platform input, rendering, audio—all handled by Unity

You could develop on a Mac and build for:
- Windows
- Mac
- Linux
- iOS
- Android
- Web (via Unity Web Player, later WebGL)
- PlayStation
- Xbox
- Nintendo Switch

All from one codebase.

**The GPU Abstraction**: Unity didn't force you to learn DirectX or OpenGL. It provided a unified shader language and automatically translated it:
- DirectX for Windows/Xbox
- OpenGL for Mac/Linux/older mobile
- Metal for modern iOS/Mac
- Proprietary APIs for consoles

### The Modern Era: Platform Convergence

Today, platform differences are shrinking:

1. **Similar Architectures**: 
   - PC, Mac (since 2006-2020), Xbox, PlayStation 4/5 all use x86-64
   - Mac now uses ARM (Apple Silicon, since 2020)
   - Mobile uses ARM
   - Nintendo Switch uses ARM

2. **Unified Graphics APIs**:
   - **Vulkan**: Cross-platform, modern, low-level (PC, Linux, Android)
   - **Metal**: Apple's modern API (Mac, iOS)
   - **DirectX 12**: Windows and Xbox
   - **WebGPU**: Emerging web standard

3. **Web as a Platform**: With WebGL and WebGPU, browsers are becoming viable game platforms. Write once, run anywhere with internet access—no installation required.

**Why We're Building for the Web**:

For this book, we're targeting the web because:
- **True cross-platform**: Mac, Windows, Linux, mobile—anything with a browser
- **No platform SDK required**: No dealing with Apple's developer program, Microsoft's certification, or console NDAs
- **Instant deployment**: No app store approval process
- **Hardware abstraction**: WebGL/WebGPU handle GPU differences
- **Mac-friendly**: You can develop entirely on your Mac with Chrome

The web has become what Unity promised in 2005: a truly universal game platform. You're not building a Windows game or a Mac game—you're building a *web* game that happens to work everywhere.

### The GPU-Engine Relationship Today

Modern game engines are essentially **GPU management systems**. Here's what they do:

1. **Scene Graph → GPU Commands**: Convert your game objects into draw calls
2. **Shader Management**: Handle the programs that run on your GPU
3. **Resource Management**: Move textures and models into GPU memory
4. **Optimization**: Batch draw calls, cull invisible objects, manage LOD
5. **Abstraction**: Hide the complexity of different GPUs and graphics APIs

When you use Unity, Unreal, or the engine we're building, you're not manually programming the GPU (though you can with custom shaders). The engine handles the translation from "here's a 3D cube" to "execute these millions of GPU operations."

This is why modern game development is possible. Imagine if you had to write separate OpenGL, DirectX, Metal, and Vulkan code for every game object. You'd never finish. Engines let you write once and run everywhere—the original promise of Java, finally fulfilled for games.

## Engine vs. Framework vs. Library

Let's clarify some terminology, because these words often get mixed up:

### Library
A **library** is a collection of code that you can call from your program. You control the flow of your application and call library functions when you need them.

Example: Three.js (which we'll use) is a 3D graphics library. You call its functions to create 3D objects and render them, but it doesn't dictate how your game runs.

```javascript
// You're in control
const geometry = new THREE.BoxGeometry();  // Using a library function
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
// You decide when and how to use these
```

### Framework
A **framework** inverts this relationship. It provides the structure and flow of your application, and you fill in specific pieces. The framework calls your code, not the other way around.

Example: React is a framework. It calls your component functions when it needs to render.

```javascript
// React is in control, it calls your function
function MyComponent() {
    return <div>Hello</div>;
}
```

### Engine
A **game engine** is typically a comprehensive framework that includes:
- A core loop (the framework part)
- Multiple integrated libraries (rendering, physics, audio)
- Tools (editor, asset pipeline)
- An architecture for organizing your game

When you use Unity or Unreal, you're working within their structure. You create components, scripts, and assets that the engine orchestrates.

**What we're building** is a game engine. It will have a core loop that runs continuously, systems that work together, and a component architecture for organizing game objects.

## Overview of Modern Game Engine Architecture

Let's peek under the hood of what a modern game engine contains:

### The Core Loop
The heartbeat of any game. It runs continuously, typically 60 times per second, executing:
1. Process input
2. Update game state
3. Render the frame
4. Repeat

### Major Systems

**Rendering Engine**
- Communicates with the GPU
- Manages the scene graph (what objects exist and where)
- Handles shaders, materials, textures
- Implements lighting and effects

**Physics Engine**
- Detects collisions between objects
- Simulates realistic movement and forces
- Handles constraints and joints

**Audio Engine**
- Plays sound effects and music
- Manages 3D spatial audio
- Handles mixing and effects

**Input System**
- Captures keyboard, mouse, touch, gamepad input
- Provides a clean API for game code

**Asset Management**
- Loads textures, models, sounds, and other resources
- Manages memory and caching
- Handles streaming for large games

**Animation System**
- Plays skeletal animations
- Blends between animation states
- Handles procedural animation

**Scripting/Gameplay Layer**
- Where your game logic lives
- Components and game objects
- Event systems and communication

**Editor (optional but powerful)**
- Visual scene editing
- Asset importing and management
- Play-in-editor testing

### The Layered Architecture

Think of a game engine like a layer cake:

```
┌─────────────────────────────────┐
│      Game-Specific Code         │  ← Your game
├─────────────────────────────────┤
│   Gameplay Systems & Editor     │  ← Engine features
├─────────────────────────────────┤
│  Core Systems (Rendering, ECS)  │  ← Engine core
├─────────────────────────────────┤
│    Platform Layer (WebGL, OS)   │  ← Browser/OS
└─────────────────────────────────┘
```

Each layer only talks to the layer below it. This separation makes code maintainable and portable.

## Understanding the Game Loop

The game loop is the most fundamental concept in game development. Every game, from Pong to Cyberpunk 2077, has one.

### Why Do We Need a Loop?

Unlike a traditional program that starts, does something, and exits, a game needs to:
- Continuously respond to player input
- Update the game world many times per second
- Render frames smoothly to create the illusion of motion

A game is more like a living, breathing thing than a batch process.

### The Basic Structure

Here's the simplest game loop in pseudocode:

```
while (game is running) {
    processInput();
    update();
    render();
}
```

That's it. This simple pattern drives every game you've ever played.

### Frame Rate and Delta Time

**Frame rate** is how many times per second the loop executes. 60 FPS (frames per second) means the loop runs 60 times every second—that's once every 16.67 milliseconds.

But what if a computer is slow and can only manage 30 FPS? Your game would run in slow motion if you weren't careful. This is where **delta time** comes in.

Delta time (often called `dt`) is the amount of time that passed since the last frame. Instead of moving a character "5 pixels per frame," you move them "300 pixels per second * deltaTime."

```javascript
// Bad: Frame-dependent (runs differently on different computers)
position.x += 5;

// Good: Frame-independent (runs the same everywhere)
position.x += 300 * deltaTime;
```

If deltaTime is 0.016 seconds (60 FPS), the character moves 4.8 pixels.
If deltaTime is 0.033 seconds (30 FPS), the character moves 9.9 pixels.

The character covers the same distance in one second regardless of frame rate.

### RequestAnimationFrame: The Browser's Game Loop

In web development, we use `requestAnimationFrame` to create our game loop. It's a browser API specifically designed for animation and games.

```javascript
function gameLoop(timestamp) {
    // Update game
    // Render frame
    
    requestAnimationFrame(gameLoop);  // Schedule next frame
}

requestAnimationFrame(gameLoop);  // Start the loop
```

The browser calls our function right before it's about to repaint the screen. This is typically 60 times per second on most displays, but it automatically adapts to the monitor's refresh rate.

Benefits:
- Automatically pauses when tab is not visible (saves battery)
- Synchronized with screen refresh (no tearing)
- The browser optimizes performance

### Fixed Timestep vs. Variable Timestep

There's one more complexity: physics simulations work best with a fixed timestep.

**Variable timestep** means we use whatever deltaTime we get (sometimes 16ms, sometimes 17ms, sometimes 33ms if there's a lag spike). This is simple but can make physics unstable.

**Fixed timestep** means we always update physics with the same time interval (e.g., always 16.67ms), even if frames take longer or shorter. We might need to run physics multiple times in one frame if we fell behind, or skip it if we're ahead.

We'll implement variable timestep first (simpler) and add fixed timestep for physics in later chapters.

## What We're Building

Over the course of this book, we'll build a web-based game engine from scratch. Our engine will:

- Render 3D graphics using WebGL (via Three.js)
- Support a component-based architecture (like Unity)
- Include physics and collision detection
- Handle input from keyboard and mouse
- Play audio with 3D spatial positioning
- Load and manage assets
- Provide animation support
- Include a scene editor for visual development

We're focusing on the web platform because:
1. **No installation required** - works in any browser
2. **Cross-platform by default (Browser acts as operating system)** - same code runs on Mac, Windows, Linux, mobile
3. **Instant iteration** - refresh the page to see changes
4. **Easy sharing** - send a link to share your game
5. **Modern and powerful** - WebGL 2.0 and WebGPU provide near-native performance

### Technology Stack

- **TypeScript** - Type-safe JavaScript for fewer bugs
- **Three.js** - Handles WebGL complexity for 3D rendering
- **Vite** - Lightning-fast development server and bundler
- **Node.js** - Development tooling (we won't need a backend server)

All of these are free and open-source.

## Your First Step: The Empty Game Loop

Let's get our hands dirty. We're going to create the simplest possible game engine: a blank window that runs at 60 FPS and logs timing information.

This might seem trivial, but you're laying the foundation for everything to come. Every system we build will plug into this core loop.

### What You'll Create

By the end of this chapter, you'll have:
- A project structure set up
- A development environment running
- A canvas element on screen
- A game loop running at 60 FPS
- Frame timing displayed in the console
- The foundation for all future chapters

### The Development Philosophy

As we build this engine, we'll follow these principles:

1. **Iterative Development** - We'll start simple and add complexity gradually
2. **Learn by Doing** - Every concept is immediately implemented
3. **Real-World Patterns** - We'll use the same patterns as professional engines
4. **Clean Code** - Readable, maintainable code over clever tricks
5. **Working Software** - Every chapter produces something you can run and see

Let's begin.

## Setting Up Your Development Environment

### Prerequisites

You'll need:
- A Mac (which you have)
- Chrome browser (for consistent WebGL behavior)
- A code editor - I recommend **Visual Studio Code** or Cursor (free)
- Node.js installed (version 18 or higher)

### Installing Node.js

1. Visit https://nodejs.org
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Verify installation by opening Terminal and typing:
   ```bash
   node --version
   npm --version
   ```

You should see version numbers.

### Installing Visual Studio Code

1. Visit https://code.visualstudio.com
2. Download for macOS
3. Install and open it

Recommended extensions (install from the Extensions panel):
- ESLint (code quality)
- Prettier (code formatting)
- TypeScript Vue Plugin (better TypeScript support)

### Creating the Project

We'll use Vite to scaffold our project. Open Terminal and run:

```bash
# Create a new directory for your project
mkdir my-game-engine
cd my-game-engine

# Initialize a new npm project
npm init -y

# Install Vite and TypeScript
npm install --save-dev vite typescript

# Install Three.js for rendering
npm install three
npm install --save-dev @types/three
```

This creates a `package.json` file and installs our dependencies in a `node_modules` folder (which you should never edit directly).

### Project Structure

Create this folder structure:

```
my-game-engine/
├── src/
│   ├── core/
│   │   └── Engine.ts
│   └── main.ts
├── public/
├── index.html
├── tsconfig.json
├── vite.config.ts
└── package.json
```

Let's create each file.

## Implementation Time

Now we'll write the actual code. Follow along carefully—every line matters.

### Configuration Files

First, the TypeScript configuration (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

This tells TypeScript how to compile our code. Key settings:
- `strict: true` - Catches bugs with strong type checking
- `target: ES2020` - Modern JavaScript features
- `module: ESNext` - ES6 module syntax

Next, Vite configuration (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
```

This configures our development server to run on port 3000 and whether to automatically open the browser.

Update `package.json` to add run scripts:

```json
{
  "name": "my-game-engine",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "@types/three": "^0.160.0"
  },
  "dependencies": {
    "three": "^0.160.0"
  }
}
```

### The HTML Entry Point

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Game Engine - Chapter 1</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        #game-canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
        
        #stats {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0f0;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border-radius: 4px;
            min-width: 200px;
        }
        
        #stats div {
            margin: 2px 0;
        }
    </style>
</head>
<body>
    <canvas id="game-canvas"></canvas>
    <div id="stats">
        <div>FPS: <span id="fps">0</span></div>
        <div>Frame Time: <span id="frametime">0</span>ms</div>
        <div>Running: <span id="runtime">0</span>s</div>
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

This creates:
- A full-screen canvas for rendering
- A stats overlay showing FPS and timing
- Loads our main TypeScript file

### The Engine Core

Create `src/core/Engine.ts`:

```typescript
/**
 * The core game engine class.
 * Manages the game loop, timing, and lifecycle.
 */
export class Engine {
    private canvas: HTMLCanvasElement;
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
        
        // Set canvas size to match window
        this.resizeCanvas();
        
        // Get stats display elements
        this.fpsElement = document.getElementById('fps');
        this.frametimeElement = document.getElementById('frametime');
        this.runtimeElement = document.getElementById('runtime');
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        console.log('🎮 Game Engine initialized');
        console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
    }
    
    /**
     * Resize the canvas to match window size
     */
    private resizeCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
        // For now, this is just a placeholder
    }
    
    /**
     * Update game state
     * Called every frame
     */
    private update(deltaTime: number): void {
        // In future chapters, we'll update game objects here
        // For now, we'll just log occasionally
        
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
        // Get 2D rendering context (we'll switch to WebGL/Three.js in Chapter 2)
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear the canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a simple visualization - a pulsing circle
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = 50 + Math.sin(this.runTime * 2) * 20; // Pulsing effect
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
        
        // Draw some text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Game Engine - Chapter 1', centerX, centerY - 100);
        ctx.font = '16px monospace';
        ctx.fillText('The loop is running!', centerX, centerY + 100);
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
}
```

This is the heart of our engine. Let's break down what it does:

**Constructor:**
- Finds the canvas element
- Sets up canvas sizing
- Initializes stats display references

**Game Loop:**
1. Calculates delta time (how long since last frame)
2. Updates FPS counter
3. Calls `processInput()` - placeholder for now
4. Calls `update()` - where game logic will go
5. Calls `render()` - draws the frame
6. Schedules itself to run again next frame

**Timing:**
- Tracks FPS (frames per second)
- Tracks delta time (for frame-independent movement)
- Tracks total runtime

### The Entry Point

Finally, create `src/main.ts`:

```typescript
import { Engine } from './core/Engine';

/**
 * Entry point for the game engine
 */

console.log('='.repeat(50));
console.log('🎮 GAME ENGINE - CHAPTER 1');
console.log('Building a Game Engine from Scratch');
console.log('='.repeat(50));

// Create and start the engine
const engine = new Engine('game-canvas');
engine.start();

// Make engine accessible from browser console for debugging
(window as any).engine = engine;

console.log('💡 Tip: Access the engine from console with "window.engine"');
console.log('💡 Try: window.engine.stop() or window.engine.start()');
```

This creates the engine and starts it running.

## Running Your Engine

Time to see it in action!

1. Open Terminal in your project folder
2. Run:
   ```bash
   npm run dev
   ```

3. Your browser should automatically open to `http://localhost:3000`

You should see:
- A pulsing green circle in the center
- FPS counter showing ~60
- Console logs every second
- "Game Engine - Chapter 1" text

**Congratulations!** You've created your first game engine. It's simple, but it's real.

## Understanding What Just Happened

Let's trace the execution flow:

1. **Browser loads `index.html`**
   - Creates the canvas
   - Loads `main.ts`

2. **`main.ts` executes**
   - Imports `Engine` class
   - Creates new `Engine` instance
   - Calls `engine.start()`

3. **Engine starts**
   - Records start time
   - Calls `requestAnimationFrame(gameLoop)`

4. **Browser calls `gameLoop` ~60 times per second**
   - Calculates delta time
   - Updates FPS counter
   - Calls `processInput()` (empty for now)
   - Calls `update()` (logs occasionally)
   - Calls `render()` (draws the circle)
   - Schedules next frame

5. **Loop continues indefinitely**

This pattern—creating an engine, starting it, and letting it run—is the same pattern used by Unity, Unreal, and every game engine.

## Experiments to Try

Now that you have a working engine, try these modifications:

### 1. Change the Pulse Speed
In `Engine.ts`, find this line in `render()`:
```typescript
const radius = 50 + Math.sin(this.runTime * 2) * 20;
```

Change the `2` to `5` for faster pulsing, or `0.5` for slower.

### 2. Add More Shapes
After drawing the circle, add:
```typescript
// Draw a rectangle
ctx.fillStyle = '#ff0000';
ctx.fillRect(centerX - 50, centerY - 200, 100, 30);
```

### 3. Make Something Move
Replace the static text with moving text:
```typescript
const textY = centerY + 100 + Math.sin(this.runTime) * 50;
ctx.fillText('The loop is running!', centerX, textY);
```

### 4. Cap the Frame Rate
Add this at the start of `gameLoop()` to limit to 30 FPS:
```typescript
if (this.deltaTime < 1/30) {
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    return;
}
```

### 5. Console Commands
Open the browser console (Option+Cmd+J) and try:
```javascript
window.engine.stop()   // Pause the engine
window.engine.start()  // Resume it
window.engine.getFPS() // Check current FPS
```

## What We've Learned

In this chapter, you've learned:

✅ What a game engine is and why it matters  
✅ The history of game engines from Doom to modern times  
✅ The difference between engines, frameworks, and libraries  
✅ The anatomy of a game loop  
✅ Delta time and frame-independent movement  
✅ How `requestAnimationFrame` works  
✅ How to set up a modern TypeScript project  
✅ How to structure engine code with classes  

More importantly, you've created something real. It's not much yet—just a pulsing circle—but it's alive. It's running 60 times per second, responding to the passage of time, and rendering to the screen.

## What's Next

In Chapter 2, we'll level up dramatically. We'll:
- Replace our 2D canvas with WebGL using Three.js
- Render actual 3D objects
- Add a camera and lighting
- Rotate a 3D cube in real-time

Your simple game loop will become the foundation for a 3D rendering engine.

## Common Issues and Solutions

**Issue: "Cannot find module 'vite'"**
- Solution: Run `npm install` in the project directory

**Issue: Port 3000 already in use**
- Solution: Change the port in `vite.config.ts` to 3001 or kill the process using port 3000

**Issue: Canvas is blank**
- Solution: Check browser console for errors, ensure canvas ID matches

**Issue: FPS is lower than 60**
- Solution: This is normal on some systems, especially when running dev tools

**Issue: TypeScript errors in editor**
- Solution: Make sure you ran `npm install` to install type definitions

## Exercises

Before moving to Chapter 2, try these challenges:

1. **Add a pause/play button** - Create HTML buttons that call `engine.stop()` and `engine.start()`

2. **Display average FPS** - Track the last 100 frames and display average FPS

3. **Add a simple particle effect** - Create small dots that spawn and fade out

4. **Implement a simple physics** - Make the circle bounce around the screen like a DVD screensaver

5. **Add multiple shapes** - Create an array of shapes with random colors and sizes

Don't peek ahead! Try to solve these using what you've learned. Struggling with a problem is how you internalize the concepts.

## Final Thoughts

You've taken the first step in a long journey. Building a game engine from scratch is challenging, but incredibly rewarding. Each chapter builds on the last, and soon you'll have a powerful tool that you understand completely.

Remember: every expert was once a beginner staring at a pulsing circle on a screen.

Keep going. The next chapter awaits.

---

**Chapter 1 Complete** ✓

*Deliverable: A blank canvas that renders at 60 FPS with frame timing in console*

# Appendix
## Multithreading
- CPUs
- CPU cores share L3 memory and memory controller but have their own:
    - Arithmetic Logic Unit (ALU)
    - Floating Point Unit (FPU)
    - L1 Cache (instruction + data)
    - L2 Cache
    - Registers
- logical processors (one cpu core may appear to the os as multiple cores)
- Process: A program in execution with its own memory space, file descriptors, and resources. It keeps a task queue. 
- Thread: A lightweight execution unit within a process. Threads in the same process share: *Memory space, File descriptors, Global variables*. But each thread has its own: *Stack, Registers, Program counter*. Threads can enqueue tasks to the process's task queue

```
1. User clicks app icon
    ↓
2. Operating system creates NEW PROCESS using fork
   - Allocates memory space
   - Assigns process ID (PID)
   - Sets up security context
   - Still NO code running yet!
    ↓
3. OS creates the MAIN THREAD (automatically)
   - This is the process's first thread
   - Gets its own stack
   - Gets CPU time
    ↓
4. OS loads executable into memory
    ↓
5. Main thread starts executing at entry point
   - In C/C++: main() function
   - In iOS: UIApplicationMain()
   - In Android: ActivityThread.main()
   - In JavaScript/Browser: (handled by browser process)
    ↓
6. Your code runs on main thread
    ↓
7. Your code can create additional threads
```

How a process is created
```c
// Parent process
int pid = fork();  // Creates new process + main thread in one step

if (pid == 0) {
    // Child process - already has main thread executing THIS code
    printf("Child process %d on thread %ld\n", getpid(), pthread_self());
    exec("/path/to/program");  
} else {
    // Parent process continues
    printf("Parent process %d\n", getpid());
}
```

Event loop of threads
```cpp
// Shared queue (in process memory, not thread-local)
class SharedTaskQueue {
    std::queue<Task> tasks;
    std::mutex lock;  // Protects concurrent access
    
    void enqueue(Task task) {
        std::lock_guard guard(lock);
        tasks.push(task);
    }
    
    Task dequeue() {
        std::lock_guard guard(lock);
        return tasks.pop();
    }
};

SharedTaskQueue taskQueue;  // ← Shared, not inside thread

// Main thread just references it
class MainThread {
    void run() {
        while (true) { // Event loop
            if (taskQueue.hasTask()) {  // ← Accessing shared queue
                Task task = taskQueue.dequeue();
                execute(task);
            }
        }
    }
};
```

### Scheduler Schedules Threads to Cores (iOS example)
UI on main thread with highest priority. Handles rendering, touch, etc

```
iPhone 15 Pro Example:
├── A17 Pro Chip
│   ├── 2 Performance Cores (High-power, 3.78 GHz)
│   │   ├── Core 0
│   │   └── Core 1
│   └── 4 Efficiency Cores (Low-power, 2.11 GHz)
│       ├── Core 2
│       ├── Core 3
│       ├── Core 4
│       └── Core 5

Active Threads (typical app):
├── Main Thread (your app)
├── Background Thread 1 (your app)
├── Background Thread 2 (your app)
├── SpringBoard Main Thread (home screen)
├── System Service Thread
├── Network Thread
├── ... dozens more system threads
└── Total: 50-200+ threads competing for 6 cores!
```

Priority based preemptive scheduler
```
Priority Levels (0-127, higher = more important):

Real-Time Priority (96-127):
├── 127: Critical System Threads
├── 110: Audio I/O Thread (cannot miss deadlines!)
└── 96:  Time-critical operations

Time-Share Priority (0-95):
├── 47:  Main Thread (QoS User Interactive)  ← Your UI thread
├── 46:  User Interactive background work
├── 37:  User Initiated work
├── 31:  Default priority
├── 20:  Utility work
└── 4:   Background work (lowest)
```

Scenario: Main thread needs CPU while background thread is running

```
Current State:
Core 0: Background Thread (priority 20) - running
Core 1: System Thread (priority 31) - running

Main Thread wakes up (priority 47):
1. Scheduler compares priorities
2. Main thread priority (47) > Background (20)
3. Scheduler PREEMPTS background thread immediately
4. Background thread state saved, moved to run queue
5. Main thread context loaded onto Core 0
6. Main thread runs

Total time: ~50-100 microseconds for context switch
```

### JS/Browser Multithreading
Browser app is multi-process, JS runs on main thread of its tab's process.
```
Chrome Application
│
├── Browser Process (main process)
│   └── Multiple threads (UI, I/O, etc.)
│
├── Renderer Process #1 (for tab 1)
│   ├── Main Thread (JS runtime + Event Loop)
        ├── JavaScript Compilation (V8 compiles your code)
        ├── JavaScript Execution (running your code)
        ├── DOM manipulation (document.querySelector, etc.)
        ├── CSS style calculation
        ├── Layout (calculating element positions/sizes)
        ├── Paint (determining what pixels to draw)
        ├── Input events (click, keypress, scroll)
        └── Event Loop (managing task queue)
│   ├── Compositor Thread (rendering)
│   ├── Raster Threads (painting)
│   └── Worker Threads (Web Workers)
│
├── Renderer Process #2 (for tab 2)
│   ├── Main Thread (separate JS runtime)
│   └── Other threads...
│
├── GPU Process
│
└── Network Process
    └── Multiple threads for HTTP requests

Rendering loop:

User clicks button (Input captured by os then browser)
    ↓
Input event added to task queue (Main thread's queue)
    ↓
Main thread processes click event (Main thread)
    ↓
JavaScript event handler runs (Main thread)
    ↓
DOM updated (Main thread)
    ↓
Style recalculated (Main thread)
    ↓
Layout calculated (Main thread)
    ↓
Paint instructions generated (Main thread)
    ↓
Send to raster threads
    ↓
Converts paint instructions into actual pixel bitmaps (Raster threads)
    ↓
Send rasterized bitmaps to compositor thread
    ↓
Combines bitmaps into layers and composites final image (Compositor thread)
    ↓
Send to GPU/Screen
```
```js
// This is why:
// Cheap (compositor only):
element.style.transform = "translateX(100px)";
element.style.opacity = 0.5;

// Expensive (requires main thread paint + raster):
element.style.left = "100px";  // Triggers layout
element.style.backgroundColor = "red";  // Triggers paint
```


```js
console.log("Start");

setTimeout(function() {
    console.log("Inside timeout");
}, 2000);

console.log("End");

// Output:
// "Start"
// "End"
// ... 2 seconds pass ...
// "Inside timeout"
```

**What actually happened:**
```
1. Execute: console.log("Start")
2. Execute: setTimeout(...)
   - JavaScript puts a task to Browser's shared task queue
   - setTimeout RETURNS IMMEDIATELY (doesn't wait!)
   - Browser's Timer Thread handles the task
3. Execute: console.log("End")
4. JavaScript thread is now idle
5. ... 2 seconds pass (handled by browser) ...
6. Timer Thread puts the callback to task queue 
8. JavaScript found the task and executes: console.log("Inside timeout")
```

Callback Hell
```js
getUserData(userId, (user) => {
    getOrders(user.id, (orders) => {
        getOrderDetails(orders[0].id, (details) => {
            getShippingInfo(details.trackingId, (shipping) => {
                console.log(shipping);  // Finally got the data!
            });
        });
    });
});
// This becomes hard to read and maintain
```


## JS Async
### Promise
Promise implementation. Basically, you pass an aync function with 2 arguments (which are functions) to Promise as init argument and the Promise constructor will immediately run the function with the Promise's resovle and reject function as arguments. Resolve and reject runs callbacks with value defined by you in Promise constructor. callbacks are provided in then and catch. 
```js
class MyPromise {
    constructor(executor) {
        this.state = 'pending';  // 'pending', 'fulfilled', or 'rejected'
        this.value = undefined;   // resolved value or rejection reason
        this.callbacks = [];      // array of {onFulfilled, onRejected}
        
        // Call executor immediately with resolve/reject functions
        try {
            executor(this._resolve.bind(this), this._reject.bind(this));
        } catch (error) {
            this._reject(error);
        }
    }
    
    _resolve(value) {
        if (this.state !== 'pending') return;  // Can only resolve once
        
        this.state = 'fulfilled';
        this.value = value;
        
        // Execute all queued callbacks
        this.callbacks.forEach(callback => {
            if (callback.onFulfilled) {
                callback.onFulfilled(value);
            }
        });
    }
    
    _reject(reason) {
        if (this.state !== 'pending') return;  // Can only reject once
        
        this.state = 'rejected';
        this.value = reason;
        
        // Execute all queued callbacks
        this.callbacks.forEach(callback => {
            if (callback.onRejected) {
                callback.onRejected(reason);
            }
        });
    }
    
    then(onFulfilled, onRejected) {
        return new MyPromise((resolve, reject) => {
            const handle = () => {
                if (this.state === 'fulfilled') {
                    if (onFulfilled) {
                        try {
                            const result = onFulfilled(this.value);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        resolve(this.value);
                    }
                } else if (this.state === 'rejected') {
                    if (onRejected) {
                        try {
                            const result = onRejected(this.value);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(this.value);
                    }
                }
            };
            
            if (this.state === 'pending') {
                // Promise not settled yet, queue callback
                this.callbacks.push({
                    onFulfilled: onFulfilled ? () => handle() : null,
                    onRejected: onRejected ? () => handle() : null
                });
            } else {
                // Promise already settled, execute immediately (as microtask)
                queueMicrotask(handle);
            }
        });
    }
    
    catch(onRejected) {
        return this.then(null, onRejected);
    }
}
```

```js
// Usage:
const promise = new MyPromise((resolve, reject) => {
    setTimeout(() => resolve("done"), 1000);
});

promise.then(result => console.log(result));

// What happens:
// 1. MyPromise constructor runs
// 2. executor function called with resolve/reject
// 3. setTimeout schedules resolve("done") for later
// 4. Constructor returns, promise.state = 'pending'
// 5. .then() is called, adds callback to callbacks array
// 6. 1 second later, resolve("done") executes
// 7. Changes state to 'fulfilled', value to "done"
// 8. Resovle executes all callbacks in callbacks array
// 9. Your callback runs: console.log("done")
```

### Async Await
```js
// You write:
async function fetchData() {
    return "hello";
}

// Compiler transforms to:
function fetchData() {
    return Promise.resolve("hello");
}

// note that Promise.resolve("hello") equals
new Promise((resolve) => {
    resolve("hello");
});

// You write:
async function example() {
    console.log("A");
    const result = await Promise.resolve("B");
    console.log(result);
    console.log("C");
}

// Compiler transforms to something like:
function example() {
    return new Promise((resolve) => {
        console.log("A");
        
        Promise.resolve("B").then((result) => {
            console.log(result);
            console.log("C");
            resolve(undefined);
        });
    });
}
```

### requestAnimationFrame
https://medium.com/@wul55267/demystifying-the-js-event-loop-a-bytedance-interview-question-to-deeply-understand-async-await-b0b9ad303884

```
Event Loop (Main Thread):
│
├── Execute JavaScript
├── Process microtasks
│
├── requestAnimationFrame callbacks  ← YOUR CALLBACK RUNS HERE
│
├── Style calculation (Main thread)
├── Layout calculation (Main thread)
├── Paint instructions (Main thread)  ← This is the "repaint"
│
└── Send to Raster → Compositor → Screen
```

Event Loop implementation
```js
function eventLoop() {
    while (true) {
        while (taskQueue.hasTask()) {
            executeTask(taskQueue.dequeue());
        }
        while (microtaskQueue.hasTask()) {
            executeTask(microtaskQueue.dequeue());
        }
        // 3. Render (60fps = every ~16ms)
        if (shouldRender()) {
            const snapshot = rafQueue.slice();  // Copy current callbacks
            rafQueue = [];  // Clear original
            
            snapshot.forEach(callback => {
                callback();  // New RAF calls go to empty rafQueue
            });
            
            // rafQueue now has callbacks for NEXT frame only
            // render
            recalculateStyles();
            doLayout();
            paint();
        }        
    }
}

```

so in the Engine, after start finishes, gameLoop() is put on a before raf (requestAnimationFrame) queue, then right before rendering the first frame, gameLoop() is called and after all game calculations, gameLoop() is again put on the queue. 