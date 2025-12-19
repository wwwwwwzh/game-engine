/**
 * Interface for objects that can be serialized to/from JSON.
 * Implemented by GameObject and Component classes.
 */
export interface ISerializable {
    /**
     * Serialize this object to a JSON-compatible structure
     */
    serialize(): any;

    /**
     * Deserialize data into this object
     * @param data The serialized data
     */
    deserialize(data: any): void;
}
