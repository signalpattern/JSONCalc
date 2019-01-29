import {get, set, isString, isObjectLike, has, isNil, cloneDeep, uniqBy, findKey, toPath} from "lodash";
import * as stringReplaceAsync from "string-replace-async";

interface CustomCalcOptions {
    name: string;
    options: any;
}

export type CustomCalcProvider = (providerName: string, providerOptions?: any, refStack?:string[]) => Promise<any>;

export class JSONCalc {

    static CUSTOM_CALC_KEY_PREFIX = "$";
    static STRING_REFERENCE_REGEX = "{{(.+?)}}";
    static MISSING_VALUE_PLACEHOLDER = "#VALUE!";

    private static _extractCustomCalcOptions(theObject: object): CustomCalcOptions {
        let providerName = findKey(theObject, (keyValue, keyName) => {
            return keyName.indexOf(JSONCalc.CUSTOM_CALC_KEY_PREFIX) === 0;
        });

        if (!isNil(providerName)) {
            return {
                name: providerName,
                options: get(theObject, providerName)
            };
        }

        return null;
    }

    private static async _processCustomCalcOptions(calcOption: CustomCalcOptions,
                                                   calculatorDoc: object,
                                                   customCalcProvider: CustomCalcProvider,
                                                   refStack: string[] = []): Promise<any> {
        switch (calcOption.name) {
            case "$ref": {
                let referencePathString = calcOption.options;

                if (refStack.indexOf(referencePathString) !== -1) {
                    throw new Error(`Circular reference: ${refStack.join("->")}`);
                }

                let currentPath = toPath(referencePathString);
                let objectValue;

                while(currentPath.length > 0)
                {
                    if(has(calculatorDoc, currentPath))
                    {
                        objectValue = get(calculatorDoc, currentPath);
                        break;
                    }

                    currentPath.pop();
                }

                // Give the custom calc provider an opportunity to give a value
                if(isNil(objectValue) && !isNil(customCalcProvider))
                {
                    objectValue = await customCalcProvider(calcOption.name, calcOption.options, refStack);
                }
                else
                {
                    objectValue = await JSONCalc._calculate(objectValue, calculatorDoc, customCalcProvider, refStack.concat([referencePathString]));
                }

                if(!isNil(objectValue))
                {
                    if(currentPath.length > 0)
                    {
                        set(calculatorDoc, currentPath, objectValue);
                        return get(calculatorDoc, referencePathString);
                    }

                    return objectValue;
                }

                return;
            }
            default: {
                let options = await JSONCalc.calculate(calcOption.options, calculatorDoc, customCalcProvider);

                if (!isNil(customCalcProvider)) {
                    return customCalcProvider(calcOption.name, options, refStack);
                }
            }
        }
    }

    private static async _calculate(objectToCalculate: string | object,
                                    calculatorDoc: object,
                                    customCalcProvider?: CustomCalcProvider,
                                    refStack: string[] = []): Promise<any> {

        if (isString(objectToCalculate)) {
            // This is a string, let's go through and replace any references in the form of {{reference}}
            return stringReplaceAsync.seq(
                objectToCalculate as string,
                new RegExp(JSONCalc.STRING_REFERENCE_REGEX, "g"),
                async (fullRef: string, refString: string) => {
                    let returnString = await JSONCalc._processCustomCalcOptions({name: "$ref", options: refString}, calculatorDoc, customCalcProvider, refStack);

                    if(isNil(returnString))
                    {
                        returnString = JSONCalc.MISSING_VALUE_PLACEHOLDER;
                    }
                    else if(isObjectLike(returnString))
                    {
                        returnString = JSON.stringify(returnString);
                    }

                    return returnString;
                });

        } else if (isObjectLike(objectToCalculate)) {
            let customCalcOptions = JSONCalc._extractCustomCalcOptions(objectToCalculate as object);

            if (!isNil(customCalcOptions)) {
                // This is a custom calc object.
                return JSONCalc._processCustomCalcOptions(customCalcOptions, calculatorDoc, customCalcProvider, refStack)
            } else {
                let objectKeys = Object.keys(objectToCalculate);
                for(let key of objectKeys)
                {
                    let value = objectToCalculate[key];
                    objectToCalculate[key] = await JSONCalc._calculate(value, calculatorDoc, customCalcProvider, refStack);
                }
            }
        }

        return objectToCalculate;
    }

    /**
     * Calculate.
     * @param objectToCalculate
     * @param calculatorDoc
     * @param customCalcProvider
     */
    static async calculate(objectToCalculate: object | string,
                           calculatorDoc: object,
                           customCalcProvider?: CustomCalcProvider): Promise<any> {
        return this._calculate(objectToCalculate, calculatorDoc, customCalcProvider);
    }
}