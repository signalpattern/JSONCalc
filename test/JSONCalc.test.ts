import * as assert from "assert";
import {JSONCalc} from "../JSONCalc";

describe("calculate", () => {
    it("should calculate a simple string reference", async () => {

        let result = await JSONCalc.calculate("this is {{object1}}", {
            object1: "cool!"
        });

        assert.strictEqual(result, "this is cool!");
    });

    it("calculate a complex string reference", async () => {

        let result = await JSONCalc.calculate("this is {{object1.subObject1}}", {
            object1: {
                subObject1: "cool!"
            }
        });

        assert.strictEqual(result, "this is cool!");
    });

    it("should calculate a simple object reference", async () => {

        let result = await JSONCalc.calculate({test: {$ref: "object1"}}, {
            object1: "cool!"
        });

        assert.deepStrictEqual(result, {test: "cool!"});
    });

    it("should calculate a complex object reference", async () => {

        let result = await JSONCalc.calculate({test: {$ref: "object1.subObject1"}}, {
            object1: {
                subObject1: "cool!"
            }
        });

        assert.deepStrictEqual(result, {test: "cool!"});
    });

    it("should calculate a multi-step complex object reference", async () => {

        let calcDoc = {
            object1: {
                subObject1: {$ref: "object2"}
            },
            object2: {
                subObject2: "cool!"
            }
        };

        let result = await JSONCalc.calculate({test: {$ref: "object1.subObject1.subObject2"}}, calcDoc);

        assert.deepStrictEqual(result, {test: "cool!"});
    });

    it("should modify the calcDoc after calculating", async () => {

        let calcDoc = {
            object1: {
                subObject1: {$ref: "object2"}
            },
            object2: {
                subObject2: "cool!"
            }
        };

        let result = await JSONCalc.calculate({test: {$ref: "object1.subObject1.subObject2"}}, calcDoc);

        assert.deepStrictEqual(calcDoc, {
            object1: {
                subObject1: {
                    subObject2: "cool!"
                }
            },
            object2: {
                subObject2: "cool!"
            }
        });
    });

    it("should detect a circular reference", async () => {
        try {
            await JSONCalc.calculate({test: {$ref: "object1"}}, {
                object1: "{{object2}}",
                object2: {
                    subObject1: "{{object1}}"
                }
            });
        } catch (e) {
            return;
        }

        assert.fail("Should throw an exception");
    });

    it("should calculate a with custom calculation with a missing reference", async () => {

        let result = await JSONCalc.calculate("this is {{not_here.value}}",
            {},
            async (name, options) => {
                if (name === "$ref" && options === "not_here.value") {
                    return "cool!";
                }
            });

        assert.strictEqual(result, "this is cool!");
    });
});