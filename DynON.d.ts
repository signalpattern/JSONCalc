/**
 * A reference.
 */
export interface Reference {
    location?: string;
    objectPath?: string;
}
export declare type RemoteDocProvider = (location: string) => Promise<any>;
export declare type CustomDataProvider = (providerName: string, providerOptions?: any) => Promise<any>;
export declare class DynON {
    static REFERENCE_PATH: string;
    static STRING_REFERENCE: string;
    static PROVIDER_PREFIX: string;
    static REFERENCE_PROVIDER_KEY: string;
    private static _extractReferences;
    private static _extractReferenceProviderData;
    /**
     * Will parse a reference path into the individual constituents.
     * @param referenceString - A string in the form of `[remoteURI#]localPath`. See readme for more details.
     */
    static parseReferencePath(referenceString: string): Reference;
    /**
     * Extract a list of references within a string or an object
     * @param objectOrString - The string or object to extract references from.
     */
    static extractReferences(objectOrString: any): Reference[];
    private static _getReferenceValue;
    private static _fillReferences;
    /**
     * Fill references in an object or string.
     * @param objectOrString - The object or string to find and fill in references within.
     * @param dataDoc - The object that provides the data to that can be referenced. It may be the same object as as the `objectOrString` parameter.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     */
    static fillReferences(objectOrString: string | object, dataDoc: any, remoteDocProvider?: RemoteDocProvider, customDataProvider?: CustomDataProvider): Promise<any>;
    /**
     * Fill references in an object at the given path.
     * @param object - The to find and fill references within.
     * @param path - The path within the object find and fill references. Anything at or below this path will be procesed.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     * @param defaultValue - If no value is found, this optional value will be returned.
     */
    static get(object: object, path: string | string[], remoteDocProvider?: RemoteDocProvider, customDataProvider?: CustomDataProvider, defaultValue?: any): Promise<any>;
}
