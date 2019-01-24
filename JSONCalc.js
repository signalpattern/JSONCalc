"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const stringReplaceAsync = require("string-replace-async");
class JSONCalc {
    /*static REFERENCE_PATH = "(?:(.+?)#)?(.+)";
    static STRING_REFERENCE = `{{(?:(.+?)#)?(.+?)}}`;
    static PROVIDER_PREFIX = "$";
    static REFERENCE_PROVIDER_KEY = `${JSONCalc.PROVIDER_PREFIX}ref`;


    private static _extractReferences(objectOrString: any, path: string[]): Reference[] {
        let foundReferences: Reference[] = [];

        if (isString(objectOrString)) {
            // Extract references in the form of {{something}} from strings
            (objectOrString as string).replace(new RegExp(JSONCalc.STRING_REFERENCE, "g"), (fullRef, location, objectPath) => {
                foundReferences.push({
                    location: location,
                    objectPath: objectPath
                });
                return "";
            });
        } else if (isObjectLike(objectOrString)) {
            // Look for values that look like {$:"something"}
            let objectValue = get(objectOrString, JSONCalc.REFERENCE_PROVIDER_KEY);
            if (isString(objectValue)) {
                let reference = JSONCalc.parseReferencePath(objectValue);
                if (!isNil(reference)) {
                    foundReferences.push(reference);
                }
            } else // Otherwise, recursively loop through all children and look for references
            {
                each(objectOrString, (value, key) => {
                    let childPath = path.concat([key]);
                    foundReferences = foundReferences.concat(JSONCalc._extractReferences(value, childPath));
                });
            }
        }

        return uniqBy(foundReferences, (reference: Reference) => reference.location + reference.objectPath);
    }*/
    static _extractCustomCalcOptions(theObject) {
        let providerName = lodash_1.findKey(theObject, (keyValue, keyName) => {
            return keyName.indexOf(JSONCalc.CUSTOM_CALC_KEY_PREFIX) === 0;
        });
        if (!lodash_1.isNil(providerName)) {
            return {
                name: providerName,
                options: lodash_1.get(theObject, providerName)
            };
        }
        return null;
    }
    /**
     * Will parse a reference path into the individual constituents.
     * @param referenceString - A string in the form of `[remoteURI#]localPath`. See readme for more details.
     */
    /*static parseReferencePath(referenceString: string): Reference {

        let returnReference: Reference;

        referenceString.replace(new RegExp(JSONCalc.REFERENCE_PATH), (fullRef, location, objectPath) => {

            returnReference = {
                location: location,
                objectPath: objectPath
            };

            return "";
        });

        return returnReference;
    }*/
    /**
     * Extract a list of references within a string or an object
     * @param objectOrString - The string or object to extract references from.
     */
    /*static extractReferences(objectOrString: any): Reference[] {
        return JSONCalc._extractReferences(objectOrString, []);
    }*/
    /*private static async _getReferenceValue(dataDoc: any,
                                            dataDocLocation: string,
                                            objectPath: string,
                                            remoteDocProvider: RemoteDocProvider,
                                            remoteDocs: RemoteDocs = {},
                                            customDataProvider: CustomCalcProvider,
                                            stack: string[] = [],
                                            dataPath: string[] = []): Promise<any> {

        let value;

        // Traverse down the object path to see if it has any object references
        let objectPathParts = toPath(objectPath);
        let currentObjectPath = [];
        if (objectPathParts.length > 0) {
            for (let objectPathPart of objectPathParts) {
                currentObjectPath.push(objectPathPart);

                let value = get(dataDoc, currentObjectPath);
                let providerData = JSONCalc._extractCustomCalcOptions(value);

                let newDataPath = cloneDeep(currentObjectPath);

                if (!isNil(dataDocLocation) && newDataPath.length > 0) {
                    newDataPath[0] = `${dataDocLocation}#${newDataPath[0]}`;
                }

                // If this contains an object reference, we need to fill the reference before we can go any further
                if (!isNil(providerData)) {
                    let result = await JSONCalc._fillReferences(value, dataDocLocation, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack, newDataPath);
                    set(dataDoc, currentObjectPath, result);
                    break;
                }
            }
        }

        value = cloneDeep(get(dataDoc, objectPath));

        // If the value is undefined, can we get this from a remote doc?
        if (isUndefined(value) && !isNil(remoteDocProvider)) {
            let reference = JSONCalc.parseReferencePath(objectPath);
            if (!isNil(reference.location)) {
                let remoteDoc = remoteDocs[reference.location];

                if (isNil(remoteDoc) && !isNil(remoteDocProvider)) {
                    remoteDoc = await remoteDocProvider(reference.location);
                    remoteDocs[reference.location] = remoteDoc;
                }

                dataDoc = cloneDeep(remoteDoc);
                dataDocLocation = reference.location;

                return JSONCalc._getReferenceValue(dataDoc, dataDocLocation, reference.objectPath, remoteDocProvider, remoteDocs, customDataProvider, stack, dataPath);
            }
        }

        if (isUndefined(value) && !isNil(customDataProvider)) {
            // If this value doesn't exist, allow the CustomDataProvider to provide a value
            value = await customDataProvider("$ref", objectPath, dataPath);
        }

        return JSONCalc._fillReferences(value, dataDocLocation, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack, dataPath);
    }

    private static async _fillReferences(objectOrString: string | object,
                                         dataDoc: any,
                                         dataDocLocation: string,
                                         remoteDocProvider: RemoteDocProvider,
                                         remoteDocs: RemoteDocs = {},
                                         customDataProvider: CustomCalcProvider,
                                         stack: string[] = [],
                                         dataPath: string[] = []): Promise<any> {
        if (isString(objectOrString)) {
            // This is a string, replace any string references in the form of {{reference}}
            return stringReplaceAsync(
                objectOrString as string,
                new RegExp(JSONCalc.STRING_REFERENCE, "g"),
                async (fullRef: string) => {

                    fullRef = fullRef.replace(/[{}]/g, "");

                    let value = await JSONCalc._getReferenceValue(dataDoc, dataDocLocation, fullRef, remoteDocProvider, remoteDocs, customDataProvider, stack, dataPath);

                    if (isNil(value)) {
                        value = JSONCalc.MISSING_VALUE_PLACEHOLDER;
                    } else if (isObjectLike(value)) {
                        value = JSON.stringify(value);
                    } else {
                        value = value.toString();
                    }

                    return value;
                });

        } else if (isObjectLike(objectOrString)) {
            // Does this have a custom data action?
            let providerData = JSONCalc._extractCustomCalcOptions(objectOrString as object);

            if (!isNil(providerData)) {
                // This is a reference to other data
                if (providerData.name === JSONCalc.REFERENCE_PROVIDER_KEY && isString(providerData.options)) {

                    try {
                        return await JSONCalc._getReferenceValue(dataDoc, dataDocLocation, providerData.options, remoteDocProvider, remoteDocs, customDataProvider, stack, dataPath);
                    } catch (e) {
                        return e;
                    }
                } else {
                    providerData.options = await JSONCalc._fillReferences(providerData.options, dataDoc, dataDocLocation, remoteDocProvider, remoteDocs, customDataProvider, stack, dataPath);

                    let customData;
                    if (!isNil(customDataProvider)) {
                        customData = await customDataProvider(providerData.name, providerData.options, dataPath);
                    }

                    return isUndefined(customData) ? objectOrString : customData;
                }
            } else {
                // This is a plain old object, loop through it and look for any references in it
                let actions = map(objectOrString, (value, key) => {
                    return new Promise((resolve, reject) => {
                        JSONCalc._fillReferences(value, dataDoc, dataDocLocation, remoteDocProvider, remoteDocs, customDataProvider, stack.concat(key), dataPath.concat(key)).then((value) => {
                            objectOrString[key] = value;
                            resolve();
                        }).catch(reject);
                    });
                });

                await Promise.all(actions);
            }
        }

        return objectOrString;
    }*/
    static _processCustomCalcOptions(calcOption, calculatorDoc, customCalcProvider, refStack = []) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (calcOption.name) {
                case "$ref": {
                    let referencePathString = calcOption.options;
                    if (refStack.indexOf(referencePathString) !== -1) {
                        throw new Error(`Circular reference: ${refStack.join("->")}`);
                    }
                    let currentPath = lodash_1.toPath(referencePathString);
                    let objectValue;
                    while (currentPath.length > 0) {
                        if (lodash_1.has(calculatorDoc, currentPath)) {
                            objectValue = lodash_1.get(calculatorDoc, currentPath);
                            break;
                        }
                        currentPath.pop();
                    }
                    // Give the custom calc provider an opportunity to give a value
                    if (lodash_1.isUndefined(objectValue) && !lodash_1.isNil(customCalcProvider)) {
                        objectValue = yield customCalcProvider(calcOption.name, calcOption.options);
                    }
                    else {
                        objectValue = yield JSONCalc._calculate(objectValue, calculatorDoc, customCalcProvider, refStack.concat([referencePathString]));
                    }
                    if (!lodash_1.isUndefined(objectValue)) {
                        if (currentPath.length > 0) {
                            lodash_1.set(calculatorDoc, currentPath, objectValue);
                            return lodash_1.get(calculatorDoc, referencePathString);
                        }
                        return objectValue;
                    }
                    return undefined;
                }
                default: {
                    if (!lodash_1.isNil(customCalcProvider)) {
                        return customCalcProvider(calcOption.name, calcOption.options);
                    }
                }
            }
        });
    }
    static _calculate(objectToCalculate, calculatorDoc, customCalcProvider, refStack = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (lodash_1.isString(objectToCalculate)) {
                // This is a string, let's go through and replace any references in the form of {{reference}}
                return stringReplaceAsync(objectToCalculate, new RegExp(JSONCalc.STRING_REFERENCE_REGEX, "g"), (fullRef, refString) => __awaiter(this, void 0, void 0, function* () {
                    let returnString = yield JSONCalc._processCustomCalcOptions({ name: "$ref", options: refString }, calculatorDoc, customCalcProvider, refStack);
                    if (lodash_1.isNil(returnString)) {
                        returnString = JSONCalc.MISSING_VALUE_PLACEHOLDER;
                    }
                    else if (lodash_1.isObjectLike(returnString)) {
                        returnString = JSON.stringify(returnString);
                    }
                    return returnString;
                }));
            }
            else if (lodash_1.isObjectLike(objectToCalculate)) {
                let customCalcOptions = JSONCalc._extractCustomCalcOptions(objectToCalculate);
                if (!lodash_1.isNil(customCalcOptions)) {
                    // This is a custom calc object.
                    return JSONCalc._processCustomCalcOptions(customCalcOptions, calculatorDoc, customCalcProvider, refStack);
                }
                else {
                    // This is just a standard object. Loop through every key, value and process each.
                    let promises = lodash_1.map(objectToCalculate, (value, key) => __awaiter(this, void 0, void 0, function* () {
                        objectToCalculate[key] = yield JSONCalc._calculate(value, calculatorDoc, customCalcProvider, refStack);
                    }));
                    yield Promise.all(promises);
                }
            }
            return objectToCalculate;
        });
    }
    static calculate(objectToCalculate, calculatorDoc, customCalcProvider) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._calculate(objectToCalculate, calculatorDoc, customCalcProvider);
        });
    }
}
JSONCalc.CUSTOM_CALC_KEY_PREFIX = "$";
JSONCalc.STRING_REFERENCE_REGEX = "{{(.+?)}}";
JSONCalc.MISSING_VALUE_PLACEHOLDER = "#VALUE!";
exports.JSONCalc = JSONCalc;
//# sourceMappingURL=JSONCalc.js.map