import { EventHandler } from './events';
// Create an event handler
const events = new EventHandler();

// Basic event listener
events.on('update', (data: string) => {
    console.log('Update:', data);
});

// Fire the event
events.fire('update', 'Hello World');
// Output: Update: Hello World

// Event with custom scope
class MyClass {
    name = 'MyClass';
    
    constructor() {
        events.on('test', this.handleTest, this);
    }
    
    handleTest(value: number) {
        console.log(`${this.name} received:`, value);
    }
}

const obj = new MyClass();
events.fire('test', 42);
// Output: MyClass received: 42

// Once listener (fires only once)
events.once('init', () => {
    console.log('Initialized!');
});

events.fire('init'); // Output: Initialized!
events.fire('init'); // No output

// Using event handles
const handle = events.on('click', (x: number, y: number) => {
    console.log(`Clicked at ${x}, ${y}`);
});

events.fire('click', 100, 200);
// Output: Clicked at 100, 200

// Remove via handle
handle.off();
events.fire('click', 100, 200); // No output

// Chaining events on handle
const mainHandle = events.on('main', () => {
    console.log('Main event');
});

mainHandle.on('secondary', () => {
    console.log('Secondary event');
});

events.fire('main');      // Output: Main event
events.fire('secondary'); // Output: Secondary event

// Remove specific callback
function myCallback(msg: string) {
    console.log('Message:', msg);
}

events.on('message', myCallback);
events.fire('message', 'Test'); // Output: Message: Test

events.off('message', myCallback);
events.fire('message', 'Test'); // No output

// Remove all listeners for an event
events.on('data', () => console.log('Listener 1'));
events.on('data', () => console.log('Listener 2'));

events.fire('data');
// Output: Listener 1
// Output: Listener 2

events.off('data');
events.fire('data'); // No output

// Check if event has listeners
console.log(events.hasEvent('update')); // true or false

// Multiple arguments
events.on('complex', (a, b, c, d, e, f, g, h) => {
    console.log('Args:', a, b, c, d, e, f, g, h);
});

events.fire('complex', 1, 2, 3, 4, 5, 6, 7, 8);
// Output: Args: 1 2 3 4 5 6 7 8