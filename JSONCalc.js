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
    static _extractReferences(objectOrString, path) {
        let foundReferences = [];
        if (lodash_1.isString(objectOrString)) {
            // Extract references in the form of {{something}} from strings
            objectOrString.replace(new RegExp(JSONCalc.STRING_REFERENCE, "g"), (fullRef, location, objectPath) => {
                foundReferences.push({
                    location: location,
                    objectPath: objectPath
                });
                return "";
            });
        }
        else if (lodash_1.isObjectLike(objectOrString)) {
            // Look for values that look like {$:"something"}
            let objectValue = lodash_1.get(objectOrString, JSONCalc.REFERENCE_PROVIDER_KEY);
            if (lodash_1.isString(objectValue)) {
                let reference = JSONCalc.parseReferencePath(objectValue);
                if (!lodash_1.isNil(reference)) {
                    foundReferences.push(reference);
                }
            }
            else // Otherwise, recursively loop through all children and look for references
             {
                lodash_1.each(objectOrString, (value, key) => {
                    let childPath = path.concat([key]);
                    foundReferences = foundReferences.concat(JSONCalc._extractReferences(value, childPath));
                });
            }
        }
        return lodash_1.uniqBy(foundReferences, (reference) => reference.location + reference.objectPath);
    }
    static _extractReferenceProviderData(theObject) {
        let providerName = lodash_1.findKey(theObject, (keyValue, keyName) => {
            return keyName.indexOf(JSONCalc.PROVIDER_PREFIX) === 0;
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
    static parseReferencePath(referenceString) {
        let returnReference;
        referenceString.replace(new RegExp(JSONCalc.REFERENCE_PATH), (fullRef, location, objectPath) => {
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
    static extractReferences(objectOrString) {
        return JSONCalc._extractReferences(objectOrString, []);
    }
    static _getReferenceValue(dataDoc, location, objectPath, remoteDocProvider, remoteDocs = {}, customDataProvider, stack = []) {
        return __awaiter(this, void 0, void 0, function* () {
            let stackID = `${lodash_1.isNil(location) ? "" : `${location}#`}${objectPath}`;
            if (stack.indexOf(stackID) !== -1) {
                throw new Error(`Document contains a circular reference: ${stack.join("->")}`);
            }
            let value;
            // This is a remote document
            if (!lodash_1.isNil(location)) {
                dataDoc = remoteDocs[location];
                if (lodash_1.isNil(dataDoc) && !lodash_1.isNil(remoteDocProvider)) {
                    dataDoc = yield remoteDocProvider(location);
                    remoteDocs[location] = dataDoc;
                }
            }
            // Traverse down the object path to see if it has any object references
            let objectPathParts = lodash_1.toPath(objectPath);
            let currentObjectPath = [];
            if (objectPathParts.length > 0) {
                for (let objectPathPart of objectPathParts) {
                    currentObjectPath.push(objectPathPart);
                    let value = lodash_1.get(dataDoc, currentObjectPath);
                    let providerData = JSONCalc._extractReferenceProviderData(value);
                    // If this contains an object reference, we need to fill the reference before we can go any further
                    if (!lodash_1.isNil(providerData)) {
                        let result = yield JSONCalc._fillReferences(value, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack.concat([stackID]));
                        lodash_1.set(dataDoc, currentObjectPath, result);
                        break;
                    }
                }
            }
            value = lodash_1.get(dataDoc, objectPath);
            return yield JSONCalc._fillReferences(value, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack.concat([stackID]));
        });
    }
    static _fillReferences(objectOrString, dataDoc, remoteDocProvider, remoteDocs = {}, customDataProvider, stack = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (lodash_1.isString(objectOrString)) {
                return stringReplaceAsync(objectOrString, new RegExp(JSONCalc.STRING_REFERENCE, "g"), (fullRef, location, objectPath) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        let value = yield JSONCalc._getReferenceValue(dataDoc, location, objectPath, remoteDocProvider, remoteDocs, customDataProvider, stack);
                        if (lodash_1.isNil(value)) {
                            value = JSONCalc.MISSING_VALUE_PLACEHOLDER;
                        }
                        else if (lodash_1.isObjectLike(value)) {
                            value = JSON.stringify(value);
                        }
                        else {
                            value = value.toString();
                        }
                        return value;
                    }
                    catch (e) {
                        return e;
                    }
                }));
            }
            else if (lodash_1.isObjectLike(objectOrString)) {
                let providerData = JSONCalc._extractReferenceProviderData(objectOrString);
                if (!lodash_1.isNil(providerData)) {
                    if (providerData.name === JSONCalc.REFERENCE_PROVIDER_KEY && lodash_1.isString(providerData.options)) {
                        let reference = JSONCalc.parseReferencePath(providerData.options);
                        try {
                            return yield JSONCalc._getReferenceValue(dataDoc, reference.location, reference.objectPath, remoteDocProvider, remoteDocs, customDataProvider, stack);
                        }
                        catch (e) {
                            return e;
                        }
                    }
                    else {
                        providerData.options = yield JSONCalc._fillReferences(providerData.options, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack);
                        let customData;
                        if (!lodash_1.isNil(customDataProvider)) {
                            customData = yield customDataProvider(providerData.name, providerData.options);
                        }
                        return lodash_1.isUndefined(customData) ? objectOrString : customData;
                    }
                }
                else {
                    let actions = lodash_1.map(objectOrString, (value, key) => {
                        return new Promise((resolve, reject) => {
                            JSONCalc._fillReferences(value, dataDoc, remoteDocProvider, remoteDocs, customDataProvider, stack).then((value) => {
                                objectOrString[key] = value;
                                resolve();
                            }).catch(reject);
                        });
                    });
                    yield Promise.all(actions);
                }
            }
            return objectOrString;
        });
    }
    /**
     * Fill references in an object or string.
     * @param objectOrString - The object or string to find and fill in references within.
     * @param dataDoc - The object that provides the data to that can be referenced. It may be the same object as as the `objectOrString` parameter.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     */
    static fillReferences(objectOrString, dataDoc, remoteDocProvider, customDataProvider) {
        return __awaiter(this, void 0, void 0, function* () {
            return JSONCalc._fillReferences(objectOrString, dataDoc, remoteDocProvider, {}, customDataProvider);
        });
    }
    /**
     * Fill references in an object at the given path.
     * @param object - The to find and fill references within.
     * @param path - The path within the object find and fill references. Anything at or below this path will be procesed.
     * @param remoteDocProvider - A callback that will be invoked when a remote document is referenced and needed.
     * @param customDataProvider - A callback that will be invoked when a custom data accessor is encountered.
     * @param defaultValue - If no value is found, this optional value will be returned.
     */
    static get(object, path, remoteDocProvider, customDataProvider, defaultValue) {
        return __awaiter(this, void 0, void 0, function* () {
            let dataDoc = lodash_1.cloneDeep(object);
            let value = lodash_1.isNil(path) || path.length === 0 ? dataDoc : lodash_1.get(object, path);
            value = yield JSONCalc.fillReferences(value, dataDoc, remoteDocProvider, customDataProvider);
            if (lodash_1.isNil(value)) {
                return defaultValue;
            }
            return value;
        });
    }
}
JSONCalc.REFERENCE_PATH = "(?:(.+?)#)?(.+)";
JSONCalc.STRING_REFERENCE = `{{(?:(.+?)#)?(.+?)}}`;
JSONCalc.PROVIDER_PREFIX = "$";
JSONCalc.REFERENCE_PROVIDER_KEY = `${JSONCalc.PROVIDER_PREFIX}ref`;
JSONCalc.MISSING_VALUE_PLACEHOLDER = "#VALUE!";
exports.JSONCalc = JSONCalc;
//# sourceMappingURL=JSONCalc.js.map