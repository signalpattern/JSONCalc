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
const JSONCalc_1 = require("../JSONCalc");
let remoteDocs = {
    "test/test": {
        "object1": "Object 1 Remote",
        "object2": "{{test}}",
        "test": "Object 2 Remote"
    }
};
function remoteDocProvider(location) {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteDocs[location];
    });
}
function actionExecutionProvider(actionName, actionOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (actionName) {
            case "$http": {
                return {
                    status: 200,
                    url: actionOptions.url
                };
            }
        }
    });
}
test("parsing a local reference path", () => {
    expect(JSONCalc_1.JSONCalc.parseReferencePath("foo.bar.test"))
        .toEqual({ location: undefined, objectPath: "foo.bar.test" });
});
test("parsing a remote reference path", () => {
    expect(JSONCalc_1.JSONCalc.parseReferencePath("test/test#foo.bar.test"))
        .toEqual({ location: "test/test", objectPath: "foo.bar.test" });
});
test("extracting references", () => {
    expect(JSONCalc_1.JSONCalc.extractReferences({
        "test1": "{{object1}}",
        "test2": "{{test/test#object1}}",
        "test3": { "$ref": "object2" },
        "test4": { "$ref": "test/test#object2" }
    }))
        .toEqual(expect.arrayContaining([
        expect.objectContaining({ location: undefined, objectPath: "object1" }),
        expect.objectContaining({ location: "test/test", objectPath: "object1" }),
        expect.objectContaining({ location: undefined, objectPath: "object2" }),
        expect.objectContaining({ location: "test/test", objectPath: "object2" }),
    ]));
});
test("filling references", () => __awaiter(this, void 0, void 0, function* () {
    expect(yield JSONCalc_1.JSONCalc.fillReferences({
        "test1": "{{object1}}",
        "test2": "{{test/test#object1}}",
        "test3": { "$ref": "object2" },
        "test4": { "$ref": "test/test#object2" }
    }, {
        "object1": "Object 1 Local",
        "object2": "Object 2 Local"
    }, remoteDocProvider))
        .toEqual({
        "test1": "Object 1 Local",
        "test2": "Object 1 Remote",
        "test3": "Object 2 Local",
        "test4": "Object 2 Remote"
    });
}));
test("catching circular references", () => __awaiter(this, void 0, void 0, function* () {
    yield expect(JSONCalc_1.JSONCalc.fillReferences({
        "test1": "{{object1}}"
    }, {
        "object1": "{{object2.level1}}",
        "object2": {
            "level1": "{{object1}}"
        }
    }, remoteDocProvider))
        .rejects
        .toThrow();
}));
test("executing a simple action 2", () => __awaiter(this, void 0, void 0, function* () {
    expect(yield JSONCalc_1.JSONCalc.fillReferences({
        "test1": { "$ref": "get_google" },
        "test2": { "$ref": "get_multi" }
    }, {
        "get_google": {
            "$http": {
                "url": "http://www.google.com"
            }
        },
        "get_multi": {
            "$http": {
                "url": {
                    "$ref": "get_google"
                }
            }
        }
    }, remoteDocProvider, actionExecutionProvider))
        .toEqual({
        "test1": {
            status: 200,
            url: "http://www.google.com"
        },
        "test2": {
            status: 200,
            url: {
                status: 200,
                url: "http://www.google.com"
            }
        }
    });
}));
test("executing a complex action", () => __awaiter(this, void 0, void 0, function* () {
    expect(yield JSONCalc_1.JSONCalc.fillReferences({
        "test1": { "$ref": "get_google.url" },
        "test2": { "$ref": "get_multi" }
    }, {
        "get_google": {
            "$http": {
                "url": "http://www.google.com"
            }
        },
        "get_multi": {
            "$http": {
                "url": {
                    "$ref": "get_google"
                }
            }
        }
    }, remoteDocProvider, actionExecutionProvider))
        .toEqual({
        "test1": "http://www.google.com",
        "test2": {
            status: 200,
            url: {
                status: 200,
                url: "http://www.google.com"
            }
        }
    });
}));
//# sourceMappingURL=JSONCalc.test.js.map