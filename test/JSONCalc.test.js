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
const assert = require("assert");
const JSONCalc_1 = require("../JSONCalc");
describe("calculate", () => {
    it("should calculate a simple string reference", () => __awaiter(this, void 0, void 0, function* () {
        let result = yield JSONCalc_1.JSONCalc.calculate("this is {{object1}}", {
            object1: "cool!"
        });
        assert.strictEqual(result, "this is cool!");
    }));
    it("calculate a complex string reference", () => __awaiter(this, void 0, void 0, function* () {
        let result = yield JSONCalc_1.JSONCalc.calculate("this is {{object1.subObject1}}", {
            object1: {
                subObject1: "cool!"
            }
        });
        assert.strictEqual(result, "this is cool!");
    }));
    it("should calculate a simple object reference", () => __awaiter(this, void 0, void 0, function* () {
        let result = yield JSONCalc_1.JSONCalc.calculate({ test: { $ref: "object1" } }, {
            object1: "cool!"
        });
        assert.deepStrictEqual(result, { test: "cool!" });
    }));
    it("should calculate a complex object reference", () => __awaiter(this, void 0, void 0, function* () {
        let result = yield JSONCalc_1.JSONCalc.calculate({ test: { $ref: "object1.subObject1" } }, {
            object1: {
                subObject1: "cool!"
            }
        });
        assert.deepStrictEqual(result, { test: "cool!" });
    }));
    it("should calculate a multi-step complex object reference", () => __awaiter(this, void 0, void 0, function* () {
        let calcDoc = {
            object1: {
                subObject1: { $ref: "object2" }
            },
            object2: {
                subObject2: "cool!"
            }
        };
        let result = yield JSONCalc_1.JSONCalc.calculate({ test: { $ref: "object1.subObject1.subObject2" } }, calcDoc);
        assert.deepStrictEqual(result, { test: "cool!" });
    }));
    it("should modify the calcDoc after calculating", () => __awaiter(this, void 0, void 0, function* () {
        let calcDoc = {
            object1: {
                subObject1: { $ref: "object2" }
            },
            object2: {
                subObject2: "cool!"
            }
        };
        let result = yield JSONCalc_1.JSONCalc.calculate({ test: { $ref: "object1.subObject1.subObject2" } }, calcDoc);
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
    }));
    it("should detect a circular reference", () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield JSONCalc_1.JSONCalc.calculate({ test: { $ref: "object1" } }, {
                object1: "{{object2}}",
                object2: {
                    subObject1: "{{object1}}"
                }
            });
        }
        catch (e) {
            return;
        }
        assert.fail("Should throw an exception");
    }));
    it("should calculate a with custom calculation with a missing reference", () => __awaiter(this, void 0, void 0, function* () {
        let result = yield JSONCalc_1.JSONCalc.calculate("this is {{not_here.value}}", {}, (name, options) => __awaiter(this, void 0, void 0, function* () {
            if (name === "$ref" && options === "not_here.value") {
                return "cool!";
            }
        }));
        assert.strictEqual(result, "this is cool!");
    }));
});
//# sourceMappingURL=JSONCalc.test.js.map