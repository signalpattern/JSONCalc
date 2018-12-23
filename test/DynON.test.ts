import {DynON} from "../DynON";

let remoteDocs = {
    "test/test": {
        "object1": "Object 1 Remote",
        "object2": "Object 2 Remote"
    }
};

async function remoteDocProvider(location: string): Promise<any> {
    return remoteDocs[location];
}

async function actionExecutionProvider(actionName: string, actionOptions?: any): Promise<any> {
    switch (actionName) {
        case "$http": {
            return {
                status: 200,
                url: actionOptions.url
            };
        }
    }
}

test("parsing a local reference path", () => {
    expect(DynON.parseReferencePath("foo.bar.test"))
        .toEqual({location: undefined, objectPath: "foo.bar.test"});
});

test("parsing a remote reference path", () => {
    expect(DynON.parseReferencePath("test/test#foo.bar.test"))
        .toEqual({location: "test/test", objectPath: "foo.bar.test"});
});

test("extracting references", () => {
    expect(DynON.extractReferences({
        "test1": "{{object1}}",
        "test2": "{{test/test#object1}}",
        "test3": {"$ref": "object2"},
        "test4": {"$ref": "test/test#object2"}
    }))
        .toEqual(
            expect.arrayContaining([
                expect.objectContaining({location: undefined, objectPath: "object1"}),
                expect.objectContaining({location: "test/test", objectPath: "object1"}),
                expect.objectContaining({location: undefined, objectPath: "object2"}),
                expect.objectContaining({location: "test/test", objectPath: "object2"}),
            ])
        );
});

test("filling references", async () => {
    expect(await DynON.fillReferences({
        "test1": "{{object1}}",
        "test2": "{{test/test#object1}}",
        "test3": {"$ref": "object2"},
        "test4": {"$ref": "test/test#object2"}
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
});

test("catching circular references", async () => {
    await expect(DynON.fillReferences({
        "test1": "{{object1}}"
    }, {
        "object1": "{{object2.level1}}",
        "object2": {
            "level1": "{{object1}}"
        }
    }, remoteDocProvider))
        .rejects
        .toThrow()
});

test("executing a simple action", async () => {
    expect(await DynON.fillReferences({
        "test1": {"$ref": "get_google"},
        "test2": {"$ref": "get_multi"}
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
});