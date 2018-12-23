#DynON - Dynamic Object Notation

DynON is a (100% compatible) format of JSON that allows objects to contain references to other JSON objects— similar to [JSON Reference](https://tools.ietf.org/html/draft-pbryan-zyp-json-ref-03), but more powerful.

#### Features

- References to other data within the same document
- References to data in remote locations
- References within strings
- Support for custom data accessors

Examples:

```
{
    "test1": "{{object1}}", // Equivalent to "This is Object 1"
    "test2": "{{object1}} and {{object2}}", // Equivalent to "This is Object 1 and This is Object 2"
    "test3": {"$ref": "object1"}, // Equivalent to "This is Object 1"
    "test4": "This {{object3.hello}}", // Equivalent to "This world"
    "test5": {"$ref": "http://test.com/doc.json#testObject.hello"}, // A value from a remote document
    "test6": {"$custom": {"option1": "value1"}}, // A custom data accessor
    "object1": "This is Object 1",
    "object2": "This is Object 2",
    "object3": {
        "hello": "world",
        "foo": "bar"
    }
}
```

#### String Notation

String notation is used when you want to combine one or more object values in to a string.

The string notation format is `"{{remoteURI#localPath}}"` where:

`remoteURI#` (optional) - A URI to a remote document somewhere else. It is up to your program to decipher and retrieve this document and provider it to the DynON parser.

`localPath` (required) - A valid JSON path to a local object value. A path can be any format accepted by the [lodash.get](https://lodash.com/docs/4.17.11#get) function.

If the reference resolves to a string, it will be inserted into the output string as is. If it refers to a non-string object, it will be converted to JSON text before being inserted.

Examples:

`"{{local_string}} and {{local_obj.level1.level2}} and {{http://test.com#remote_string}} and {{http://test.com#remote_obj.level1.level2}}"`

#### Object Notation

Object notation is used when you want to replace a value with an exact representation of the value being referenced.

The object notation format is `{"$ref": "remoteURI#localPath"}` where:

`remoteURI#` and `localPath` are the same as in the String Notation section above.

#### Custom Data Accessors

DynON also allows for custom data accessors which can be used to return data from other sources. For example:

```json
{
    "mydoc" : {"$mongo": {"server": "my-mongo-server", "password": {"$settings": "password"}}}
}
```

Any time the DynON parser encounters a key that begins with `$`, it will invoke a callback function in the implementing program and ask it to return a value.