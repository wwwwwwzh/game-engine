export class EventHandle {
    private _removed: boolean = false;
    handler: EventHandler;
    name: string;
    callback: Function;
    scope: any;
    _once: boolean;

    constructor(handler: EventHandler, name: string, callback: Function, scope: any, once: boolean = false) {
        this.handler = handler;
        this.name = name;
        this.callback = callback;
        this.scope = scope;
        this._once = once;
    }

    get removed(): boolean {
        return this._removed;
    }

    set removed(value: boolean) {
        if (!value) return;
        this._removed = true;
    }

    off(): void {
        if (this._removed) return;
        this.handler.offByHandle(this);
    }

    on(name: string, callback: Function, scope: any = this): EventHandle {
        return this.handler._addCallback(name, callback, scope, false);
    }

    once(name: string, callback: Function, scope: any = this): EventHandle {
        return this.handler._addCallback(name, callback, scope, true);
    }

    toJSON(key?: string): undefined {
        return undefined;
    }
}

export class EventHandler {
    private _callbacks: Map<string, EventHandle[]>;
    private _callbackActive: Map<string, EventHandle[]>;

    constructor() {
        this._callbacks = new Map();
        this._callbackActive = new Map();
    }

    initEventHandler(): void {
        this._callbacks = new Map();
        this._callbackActive = new Map();
    }

    _addCallback(name: string, callback: Function, scope: any, once: boolean): EventHandle {
        if (!this._callbacks.has(name)) {
            this._callbacks.set(name, []);
        }
        if (this._callbackActive.has(name)) {
            const callbackActive = this._callbackActive.get(name);
            if (callbackActive && callbackActive === this._callbacks.get(name)) {
                this._callbackActive.set(name, callbackActive.slice());
            }
        }
        const evt = new EventHandle(this, name, callback, scope, once);
        this._callbacks.get(name)!.push(evt);
        return evt;
    }

    on(name: string, callback: Function, scope: any = this): EventHandle {
        return this._addCallback(name, callback, scope, false);
    }

    once(name: string, callback: Function, scope: any = this): EventHandle {
        return this._addCallback(name, callback, scope, true);
    }

    off(name?: string, callback?: Function, scope?: any): this {
        if (name) {
            if (this._callbackActive.has(name) && this._callbackActive.get(name) === this._callbacks.get(name)) {
                this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
            }
        } else {
            for (const [key, callbacks] of this._callbackActive) {
                if (!this._callbacks.has(key)) {
                    continue;
                }
                if (this._callbacks.get(key) !== callbacks) {
                    continue;
                }
                this._callbackActive.set(key, callbacks.slice());
            }
        }

        if (!name) {
            for (const callbacks of this._callbacks.values()) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i].removed = true;
                }
            }
            this._callbacks.clear();
        } else if (!callback) {
            const callbacks = this._callbacks.get(name);
            if (callbacks) {
                for (let i = 0; i < callbacks.length; i++) {
                    callbacks[i].removed = true;
                }
                this._callbacks.delete(name);
            }
        } else {
            const callbacks = this._callbacks.get(name);
            if (!callbacks) {
                return this;
            }
            for (let i = 0; i < callbacks.length; i++) {
                if (callbacks[i].callback !== callback) {
                    continue;
                }
                if (scope && callbacks[i].scope !== scope) {
                    continue;
                }
                callbacks[i].removed = true;
                callbacks.splice(i, 1);
                i--;
            }
            if (callbacks.length === 0) {
                this._callbacks.delete(name);
            }
        }
        return this;
    }

    offByHandle(handle: EventHandle): this {
        const name = handle.name;
        handle.removed = true;
        if (this._callbackActive.has(name) && this._callbackActive.get(name) === this._callbacks.get(name)) {
            this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
        }
        const callbacks = this._callbacks.get(name);
        if (!callbacks) {
            return this;
        }
        const ind = callbacks.indexOf(handle);
        if (ind !== -1) {
            callbacks.splice(ind, 1);
            if (callbacks.length === 0) {
                this._callbacks.delete(name);
            }
        }
        return this;
    }

    fire(name: string, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any, arg6?: any, arg7?: any, arg8?: any): this {
        if (!name) {
            return this;
        }
        const callbacksInitial = this._callbacks.get(name);
        if (!callbacksInitial) {
            return this;
        }
        let callbacks: EventHandle[] | undefined;
        if (!this._callbackActive.has(name)) {
            this._callbackActive.set(name, callbacksInitial);
        } else if (this._callbackActive.get(name) !== callbacksInitial) {
            callbacks = callbacksInitial.slice();
        }
        for (let i = 0; (callbacks || this._callbackActive.get(name)) && i < (callbacks || this._callbackActive.get(name))!.length; i++) {
            const evt = (callbacks || this._callbackActive.get(name))![i];
            if (!evt.callback) continue;
            evt.callback.call(evt.scope, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            if (evt._once) {
                const existingCallback = this._callbacks.get(name);
                const ind = existingCallback ? existingCallback.indexOf(evt) : -1;
                if (ind !== -1) {
                    if (this._callbackActive.get(name) === existingCallback) {
                        this._callbackActive.set(name, this._callbackActive.get(name)!.slice());
                    }
                    const callbacks1 = this._callbacks.get(name);
                    if (!callbacks1) continue;
                    callbacks1[ind].removed = true;
                    callbacks1.splice(ind, 1);
                    if (callbacks1.length === 0) {
                        this._callbacks.delete(name);
                    }
                }
            }
        }
        if (!callbacks) {
            this._callbackActive.delete(name);
        }
        return this;
    }

    hasEvent(name: string): boolean {
        return !!(this._callbacks.get(name)?.length);
    }
}


type FunctionCallback = (...args: any[]) => any;

class Events extends EventHandler {
    functions = new Map<string, FunctionCallback>();

    // declare an editor function
    function(name: string, fn: FunctionCallback) {
        if (this.functions.has(name)) {
            throw new Error(`error: function ${name} already exists`);
        }
        this.functions.set(name, fn);
    }

    // invoke an editor function
    invoke(name: string, ...args: any[]) {
        const fn = this.functions.get(name);
        if (!fn) {
            console.log(`error: function not found '${name}'`);
            return;
        }
        return fn(...args);
    }
}

export { Events };
