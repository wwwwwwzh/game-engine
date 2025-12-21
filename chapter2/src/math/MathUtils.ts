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


