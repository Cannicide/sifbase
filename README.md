# sifbase
Simple yet powerful key-value database management.

## Installation
Install via npm:
```
npm i sifbase
```
Import in your code via CJS:
```js
const { Sifbase } = require('sifbase');
```
Or via ESM:
```js
import Sifbase from 'sifbase';
```

## Basic Usage
Usage is pretty straightforward for JSON-style data.\
Initialize your database:
```js
//CJS:
const db = new Sifbase(__dirname + "/path/to/file.json");

//ESM:
const db = new Sifbase(Sifbase.dirname + "/path/to/file.json");
```
Sifbase supports any database scheme supported by underlying dependency `Keyv`. This includes mongodb, sqlite, and many other databases, as well as basic JSON files (and a custom JSON-like file format called SIFDB).

Note that initialization in ESM is slightly different from CJS, as `__dirname` is only defined in CJS. Sifbase includes a simple utility, `Sifbase.dirname`, that can be used as an alternative to `__dirname` in ESM. Apart from importing and initialization, all other aspects of this module should be the same in CJS and ESM.

Set a value:
```js
await db.set("key", "a value");

// Or

db.key = "a value";
```

Note that most methods on Sifbase are asynchronous, as shown in the example above.

Get a value:
```js
await db.get("key"); // => "a value"

// Or

await db.key; // => "a value"
```

Check if a key exists in the database:
```js
await db.has("key"); // => true
```

Remove a key:
```js
await db.delete("key");
```

Clear the database:
```js
await db.clear();
```

Sometimes, you may want to access database values synchronously. Everytime any of the above database operation methods are called, an internal cache is updated respectively. This cache can be used to access values synchronously. Note, however, that the cache cannot be used to modify values in the database synchronously; it can only be used to retrieve values synchronously. Also note that there is no guarantee that the value in the cache will be the same as the value in the database; values are only cached when they are modified, removed, or retrieved via the above methods in your code.

Synchronously get a cached value:
```js
db.cache.get("key") // => "a value"

// Or

db.cache.key // => "a value"
```

If you want to work with only a specific table in your database, you can use namespaces to do so:
```js
// During initialization:
const myTable = new Sifbase(__dirname + "/path/to/file.json", "myTable");

// Or, after initialization:
const myTable = db.table("myTable"); // table() is synchronous
```

## Advanced Usage

Importing the contents of external JSON or SIFDB files into your database:
```js
await db.importJSON(__dirname + "/path/to/file.json");
await db.importSIFDB(__dirname + "/path/to/file.sifdb")

// Use Sifbase.dirname instead of __dirname in ESM modules
```

Working with databases or database tables that are entirely arrays:
```js
const arr = await db.asArray();

// Now use any ArrayManager methods on arr; these work very similarly to default Array methods, but are asynchronous

// Add or set a value:
await arr.push("first value");
await arr.set(0, "first value");
arr[0] = "first value";

// Get a value
await arr.get(0); // => first value
await arr[0]; // => first value

// Array-like methods
await arr.filter(item => item.startsWith("first")); // => ["first value"]
await arr.concat(["second value", "third value"]); // arr is now ["first value", "second value", "third value"]

// Extra array utilities
await arr.first(); // => "first value"
await arr.last(); // => "third value"
arr.lastIndex; // => 2
arr.toRawArray(); // => returns a normal array; modifying this normal array will not modify the database values
```
Other structures exported along with Sifbase by this module:
```js
// CJS:
const { ArrayManager, SIFDB, SifStore, Keyv } = require('sifbase');

// ESM:
import { ArrayManager, SIFDB, SifStore, Keyv } from 'sifbase';
```
`ArrayManager` is mostly just used by `Sifbase#asArray()`, but can be used manually as well:
```js
// Manually construct from Sifbase instance:
await ArrayManager.from(db);

// Manually construct from Map instance:
ArrayManager.fromRawMap(map);

// Construct from Sifbase instance:
await db.asArray();

// Construct from Sifbase cache (possible, but untested and probably not functional):
db.cache.asArray();
```
`SIFDB` is a utility similar to `JSON`, but for Sifdb structures. Sifdb structures work exactly the same as JSON, but are encoded and decoded in base64.

Static `SIFDB` utilities:
```js
SIFDB.parse("eyJ0ZXN0a2V5IjoidGVzdHZhbHVlIn0="); // => SIFDB{ akey: "a true value" }
SIFDB.stringify({ akey: "a true value" }); // => "eyJ0ZXN0a2V5IjoidGVzdHZhbHVlIn0="

SIFDB.export(__dirname + "/path/to/file.sifdb", sifDbInstance); // Saves Sifdb structure to a sifdb file
SIFDB.import(__dirname + "/path/to/file.sifdb"); // Returns parsed JSON of Sifdb structure from the sifdb file
```

`SIFDB` instance:
```js
// Construct an empty Sifdb structure:
const sifdb = new SIFDB();

// Or construct a Sifdb structure from a sifdb file:
const sifdb = new SIFDB(__dirname + "/path/to/file.sifdb");

// Get or set values:
sifdb.set("key", "a value");
sifdb.get("key"); // => "a value"

// Convert to JSON object literal:
sifdb.toJSON(); // => { key: "a value" }

// Export to file using static utility
SIFDB.export(__dirname + "/path/to/file.sifdb", sifdb);
```
`SifStore` is a `Keyv` compatible data store that works with JSON and SIFDB databases:
```js
new SifStore(__dirname + "/path/to/file.sifdb");

// Or

new SifStore(__dirname + "/path/to/file.json");
```

Setting a time limit on database entries:
```js
const db = new Sifbase(__dirname + "/path/to/file.json");
await db.set("key", "expires in 5 seconds (5000 milliseconds)", 5000);
```

New iterator features (note -- not all databases support iterators):
```js
// Note: All synchronous iterators use cached entries, and may not exactly match database entries

// Asynchronously iterate entries:
for await (const [key, value] of db) {
    console.log("Key:", key);
    console.log("Value:", value);
}

// Or use .iterator() to asynchronously iterate:
for await (const [key, value] of db.iterator()) {
    console.log("Key:", key);
    console.log("Value:", value);
}

// Synchronously iterate cached entries:
for (const [key, value] of db) {
    console.log("Key:", key);
    console.log("Value:", value);
}

// Asynchronously iterate keys with .keys():
for (const key of await db.keys()) {
    console.log("Key:", key);
}

// Asynchronously iterate values with .values():
for (const value of await db.values()) {
    console.log("Value:", value);
}

// Synchronously iterate cached keys:
for (const key of db.cache.keys()) {
    console.log("Key:", key);
}

// Synchronously iterate cached values:
for (const value of await db.cache.values()) {
    console.log("Value:", value);
}
```

## Changelogs
- **v1.0.0**
    - Created and published sifbase package
    - Added Sifbase, SIFDB, SifStore, ArrayManager
    - Added Sifbase synchronous cache
    - Added all base methods and properties
- **v1.0.1**
    - Updated dependency Keyv to latest as of May 2022
    - Added expiration time limits to Sifbase#set()
    - Fixed namespaced table synchronization issues by creating namespaced table cache
    - Added asynchronous and synchronous entry, key, and value iterators to Sifbase
    - Added entry iterator to SifStore
    - Deprecated Sifbase.__dirname(), in favor of powerful new Sifbase.dirname utility
- **v1.0.2**
    - Updated dependency Keyv to latest as of 3/6/2023
    - General improvements and bug fixes
    - Updated some documentation to be more specific and accurate
    - Many improvements to ArrayManager
        - Improved efficiency of ArrayManager#lastIndex
        - Improved efficiency of ArrayManager#toRawArray() and made it synchronous by default
        - Added ArrayManager#at() for easier access to end elements, and for increased similarity to Array
        - Added ArrayManager#includes() for easier item presence checks
        - Added ArrayManager#join() for easier manipulation into strings
        - Added ArrayManager#toSet() for easy conversion into Sets
        - Added ArrayManager#keys() and ArrayManager#values() for more consistency with Array
        - Added synchronous and asynchronous iterators for easier iteration
    - Backwards compatability with v1.0.1 naming and syntax *fully maintained*, v1.0.1 code works without any changes necessary on v1.0.2