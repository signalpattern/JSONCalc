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
                    if (lodash_1.isNil(objectValue) && !lodash_1.isNil(customCalcProvider)) {
                        objectValue = yield customCalcProvider(calcOption.name, calcOption.options, refStack);
                    }
                    else {
                        objectValue = yield JSONCalc._calculate(objectValue, calculatorDoc, customCalcProvider, refStack.concat([referencePathString]));
                    }
                    if (!lodash_1.isNil(objectValue)) {
                        if (currentPath.length > 0) {
                            lodash_1.set(calculatorDoc, currentPath, objectValue);
                            return lodash_1.get(calculatorDoc, referencePathString);
                        }
                        return objectValue;
                    }
                    return;
                }
                default: {
                    let options = yield JSONCalc.calculate(calcOption.options, calculatorDoc, customCalcProvider);
                    if (!lodash_1.isNil(customCalcProvider)) {
                        return customCalcProvider(calcOption.name, options, refStack);
                    }
                }
            }
        });
    }
    static _calculate(objectToCalculate, calculatorDoc, customCalcProvider, refStack = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (lodash_1.isString(objectToCalculate)) {
                // This is a string, let's go through and replace any references in the form of {{reference}}
                return stringReplaceAsync.seq(objectToCalculate, new RegExp(JSONCalc.STRING_REFERENCE_REGEX, "g"), (fullRef, refString) => __awaiter(this, void 0, void 0, function* () {
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
                    let objectKeys = Object.keys(objectToCalculate);
                    for (let key of objectKeys) {
                        let value = objectToCalculate[key];
                        objectToCalculate[key] = yield JSONCalc._calculate(value, calculatorDoc, customCalcProvider, refStack);
                    }
                }
            }
            return objectToCalculate;
        });
    }
    /**
     * Calculate.
     * @param objectToCalculate
     * @param calculatorDoc
     * @param customCalcProvider
     */
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