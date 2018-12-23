import {get, set, isString, isObjectLike, each, map, has, isNil, cloneDeep, uniqBy, findKey} from "lodash";
import * as stringReplaceAsync from "string-replace-async";

type RemoteDocs = { [location: string]: any };

/**
 * A reference.
 */
export interface Reference {
    location?: string;
    objectPath?: string;
}

export type RemoteDocProvider = (location: string) => Promise<any>;
export type CustomDataProvider = (providerName: string, providerOptions?: any) => Promise<any>;

export class DynON {

    static REFERENCE_PATH = "(?:(.+?)#)?(.+)";
    static STRING_REFERENCE = `{{(?:(.+?)#)?(.+?)}}`;
    static PROVIDER_PREFIX = "$";
    static REFERENCE_PROVIDER_KEY = `${DynON.PROVIDER_PREFIX}ref`;

    private static _extractReferences(objectOrString: any, path: string[]): Reference[] {
        let foundReferences: Reference[] = [];

        if (isString(objectOrString)) {
            // Extract references in the form of {{something}} from strings
            (objectOrString as string).replace(new RegExp(DynON.STRING_REFERENCE, "g"), (fullRef, location, objectPath) => {
                foundReferences.push({
                    location: location,
                    objectPath: objectPath
                });
                return "";
            });
        } else if (isObjectLike(objectOrString)) {
            // Look for values that look like {$:"something"}
            let objectValue = get(objectOrString, DynON.REFERENCE_PROVIDER_KEY);
            if (isString(objectValue)) {
                let reference = DynON.parseReferencePath(objectValue);
                if (!isNil(reference)) {
                    foundReferences.push(reference);
                }
            } else // Otherwise, recursively loop through all children and look for references
            {
                each(objectOrString, (value, key) => {
                    let childPath = path.concat([key]);
                    foundReferences = foundReferences.concat(DynON._extractReferences(value, childPath));
                });
            }
        }

        return uniqBy(foundReferences, (reference: Reference) => reference.location + reference.objectPath);
    }

    /**
     * Will parse a reference path into the individual constituents.
     * @param referenceString - A string in the form of `[remoteURI#]localPath`. See readme for more details.
     */
    static parseReferencePath(referenceString: string): Reference {

        let returnReference: Reference;

        referenceString.replace(new RegExp(DynON.REFERENCE_PATH), (fullRef, location, objectPath) => {

            returnReference = {
                location: location,
                objectPath: objectPath
            };

            return "";
        });

        return returnReference;
    }

    /**
     * Extract a list of references within a string or an object
     * @param objectOrString - The string or object to extract references from.
     */
    static extractReferences(objectOrString: any): Reference[] {
        return DynON._extractReferences(objectOrString, []);
    }

    private static async _getReferenceValue(dataDoc: any,
                                            location: string,
                                            objectPath: string,
                                            remoteDocProvider: RemoteDocProvider,
                                            remoteDocs: RemoteDocs = {},
                                            customDataProvider: CustomDataProvider,
                                            stack: string[] = []): Promise<any> {

        let stackID = `${isNil(location) ? "" : `${location}#`}${objectPath}`;

        if (stack.indexOf(stackID) !== -1) {
            throw new Error(`Document contains a circular reference: ${stack.join("->")}`);
        }

        let value;

        // Get this from a local value
        if (isNil(location)) {
            value = get(dataDoc, objectPath);
        } else {
            let remoteDoc = remoteDocs[location];

            if (isNil(remoteDoc) && !isNil(remoteDocProvider)) {
                remoteDoc = await remoteDocProvider(location);
                remoteDocs[location] = remoteDoc;
            }

            value = get(remoteDoc, objectPath);
        }

        return await DynON._fillReferences(value, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack.concat([stackID]));
    }

    private static async _fillReferences(objectOrString: string | object,
                                         dataDoc: any,
                                         remoteDocProvider: RemoteDocProvider,
                                         remoteDocs: RemoteDocs = {},
                                         customDataProvider: CustomDataProvider,
                                         stack: string[] = []): Promise<any> {
        if (isString(objectOrString)) {

            return await stringReplaceAsync(
                (objectOrString as string),
                new RegExp(DynON.STRING_REFERENCE, "g"),
                async (fullRef, location, objectPath) => {

                    let value = await DynON._getReferenceValue(dataDoc, location, objectPath, remoteDocProvider, remoteDocs, customDataProvider, stack);

                    if (isNil(value)) {
                        value = "";
                    } else if (isObjectLike(value)) {
                        value = JSON.stringify(value);
                    } else {
                        value = value.toString();
                    }

                    return value;
                });

        } else if (isObjectLike(objectOrString)) {

            let providerKey = findKey(objectOrString, (keyValue, keyName) => {
                return keyName.indexOf(DynON.PROVIDER_PREFIX) === 0;
            });
            let providerOptions = get(objectOrString, providerKey);

            if (providerKey === DynON.REFERENCE_PROVIDER_KEY && isString(providerOptions)) {
                let reference = DynON.parseReferencePath(providerOptions);
                return await DynON._getReferenceValue(dataDoc, reference.location, reference.objectPath, remoteDocProvider, remoteDocs, customDataProvider, stack);
            } else if (!isNil(providerKey)) {
                providerOptions = await DynON._fillReferences(providerOptions, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack);

                if(!isNil(customDataProvider))
                {
                    return await customDataProvider(providerKey, providerOptions);
                }

                return undefined;

            } else {

                let actions = map(objectOrString, (value, key) => {
                    return new Promise((resolve, reject) => {
                        DynON._fillReferences(value, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack).then((value) => {
                            objectOrString[key] = value;
                            resolve();
                        }).catch(reject);
                    });
                });

                await Promise.all(actions);
            }
        }

        return objectOrString;
    }

    /**
     * Fill references in an object or string.
     * @param objectOrString - The object or string to find and fill in references within.
     * @param dataDoc - The object that provides the data to that can be referenced. It may be the same object as as the `objectOrString` parameter.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     */
    static async fillReferences(objectOrString: string | object,
                                dataDoc: any,
                                remoteDocProvider?: RemoteDocProvider,
                                customDataProvider?: CustomDataProvider): Promise<any> {
        return DynON._fillReferences(objectOrString, dataDoc, remoteDocProvider, {}, customDataProvider);
    }

    /**
     * Fill references in an object at the given path.
     * @param object - The to find and fill references within.
     * @param path - The path within the object find and fill references. Anything at or below this path will be procesed.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     * @param defaultValue - If no value is found, this optional value will be returned.
     */
    static async get(object:object,
                     path:string | string[],
                     remoteDocProvider?: RemoteDocProvider,
                     customDataProvider?: CustomDataProvider,
                     defaultValue?:any): Promise<any>
    {
        let dataDoc = cloneDeep(object);
        let value = isNil(path) || path.length === 0 ? dataDoc : get(object, path);

        value = await DynON.fillReferences(value, dataDoc, remoteDocProvider, customDataProvider);

        if(isNil(value))
        {
            return defaultValue;
        }

        return value;
    }
}