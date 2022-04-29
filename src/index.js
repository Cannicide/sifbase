
const Keyv = require('keyv');
const ArrayManager = require("./ArrayManager");
const SifStore = require("./SifStore");
const fs = require('fs');

module.exports.ArrayManager = ArrayManager;
module.exports.SifStore = SifStore;
module.exports.Keyv = Keyv;

/**
 * Handles SIFDB files and structures, similar to the JSON object.
 * SIFDB files have the extension ".sifdb".
 * SIFDB structures work the same as JSON, but are encoded and decoded in base64.
 */
module.exports.SIFDB = class SifDBHandler extends Map {
    #path;
    #contents;
    constructor(path) {
        super();
        this.#path = path;
        this.#contents = SifDBHandler.import(this.#path);

        for (const key in this.#contents) {
            this.set(key, this.#contents[key]);
        }
    }

    set(key, value) {
        this.#contents[key] = value;
        return super.set(key, value);
    }

    static parse(str) {
        return new this(JSON.parse(Buffer.from(str, "base64").toString("ascii")));
    }

    static stringify(sifdbOrJson) {
        if (sifdbOrJson instanceof SifDBHandler) sifdbOrJson = sifdbOrJson.toJSON();
        return Buffer.from(JSON.stringify(sifdbOrJson)).toString("base64");
    }

    static export(filepath, sifdb) {
        if (typeof filepath !== 'string') return filepath;
        fs.writeFileSync(filepath, SifDBHandler.stringify(sifdb));
    }

    static import(filepath) {
        if (typeof filepath !== 'string') return filepath ?? {};
        return JSON.parse(Buffer.from(fs.readFileSync(filepath, "ascii"), "base64").toString("ascii"));
    }

    toJSON() {
        return this.#contents;
    }
}

module.exports.Sifbase = class Sifbase {

    #path;
    #namespace;
    #keyv;

    /**
     * Used internally to cache database tables that have been accessed by a namespace.
     * By caching namespaced tables, a new namespace is only created the first time it is accessed.
     * This cache is necessary to avoid collisions between table calls, since Sifbase#table() is synchronous.
     * @private
     */
    static NAMESPACED_TABLES = new Map();

    /**
     * Synchronously get database values, based on cached values.
     * Key-value pairs are cached whenever they are asynchronously retrieved or set.
     * 
     * Cached values can only be synchronously retrieved; they cannot be synchronously set.
     * 
     * @example
     * db.cache.get("key") // => "value"
     * 
     * @returns {Map<string, any>} Map of cached values
     */
    cache = new Proxy(new Map(), {
        get(target, prop, receiver) {
            if (prop === "asArray") return ArrayManager.fromRawMap.bind(ArrayManager, target);
            else if (!(prop in target)) return target.get(prop);
            const getter = Reflect.get(target, prop, receiver);
            return typeof getter === "function" ? getter.bind(target) : getter;
        }
    });

    /**
     * @param {String|null} path - The filepath or URL scheme of the database. Supports several database schemes, JSON files, and SIFDB files.
     * @param {String} [namespace] - The name of a table to work with, within the database.
     * @param {Keyv} [keyv] - A Keyv instance, for directly working with a custom Keyv object or store. If specified, path and namespace are ignored.
     */
    constructor(path, namespace, keyv) {
        this.#path = path;
        this.#namespace = namespace;

        if (this.#path && Sifbase.NAMESPACED_TABLES.has(this.#path) && Sifbase.NAMESPACED_TABLES.get(this.#path).has(this.#namespace)) {
            const namespacedTable = Sifbase.NAMESPACED_TABLES.get(this.#path).get(this.#namespace);
            this.#keyv = namespacedTable;
        }
        else {
            const opts = { namespace: this.#namespace };
            let isSifStore = this.#path;

            if (Sifbase.isJsonStore(this.#path) || Sifbase.isSifStore(this.#path)) {
                opts.store = new SifStore(this.#path, this.#namespace);
                isSifStore = false;
            }

            const keyvArgs = isSifStore ? [this.#path, opts] : [opts];
            this.#keyv = keyv ?? new Keyv(...keyvArgs);
            this.#keyv.on('error', err => console.error('Sifbase Connection Error', err));

            if (this.#path) {
                if (!Sifbase.NAMESPACED_TABLES.has(this.#path)) Sifbase.NAMESPACED_TABLES.set(this.#path, new Map());
                Sifbase.NAMESPACED_TABLES.get(this.#path).set(this.#namespace, this.#keyv);
            }
        }

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (!(prop in target)  && !prop.match("#")) return target.get(prop);
                const getter = Reflect.get(target, prop, receiver);
                return typeof getter === "function" ? getter.bind(target) : getter;
            },
            set(target, prop, value, _receiver) {
                if (!(prop in target)) return target.set(prop, value);
                throw new Error("Cannot modify base property " + prop + " on Sifbase object.");
                // const setter = Reflect.set(target, prop, value, receiver);
                // return typeof setter === "function" ? setter.bind(target) : setter;
            }
        });
    }

    /**
     * Utility to get the directory filepath of the file this method is called in.
     * Alternative to CJS' __dirname, for ESM modules.
     * 
     * Should work for all operating systems. Tested only in Windows and Ubuntu.
     * 
     * @example
     * const dir = Sifbase.__dirname(import.meta);
     * 
     * @param {import.meta} i - The 'import.meta' keyword.
     * @returns {String} Directory filepath.
     * @deprecated Use Sifbase.dirname instead. Use this method only if that method doesn't work.
     */
    static __dirname(i) {
        const path = i.url.substring(7, i.url.lastIndexOf("/")).replace(/%20/g, " ");
        if (path.startsWith("/C:")) return path.split("C:").slice(1).join("C:");
        return path;
    }

    /**
     * Utility to dynamically get the directory filepath of the file this property is used in.
     * Alternative to CJS' __dirname, for ESM and CJS modules.
     * An evolved version of Sifbase.__dirname(), not requiring the use of `import.meta` or a method call.
     * 
     * Should work for all operating systems. Tested only in Windows and Ubuntu.
     * 
     * @example
     * const dir = Sifbase.dirname;
     * 
     * @returns {String} Directory filepath.
     */
    static get dirname() {
        const platform = process.platform;
        const rawPath = new Error().stack.split("\n")[2].trim().split("(").slice(1).join("(").split(":").slice(0, -2).join(":").replace(/\\/g, "/").split("/").slice(0, -1).join("/");
        let encodedPath = rawPath;

        if (platform === "win32") {
            encodedPath = rawPath.split("C:").slice(1).join("C:");
        }

        return decodeURIComponent(encodedPath);
    }

    /**
     * Constructs a Sifbase instance using a provided Keyv instance.
     * @param {Keyv} keyv - A Keyv instance, for directly working with a custom Keyv object.
     * @returns {Sifbase}
     */
    static fromKeyv(keyv) {
        return new this(null, null, keyv);
    }

    /**
     * Constructs a Sifbase instance using a provided Keyv store.
     * @param {Keyv.Store} keyvStore - A Keyv Store instance, for directly working with a custom Keyv store.
     * @param {String} namespace - The name of a table to work with, within the database.
     * @returns {Sifbase}
     */
    static fromStore(keyvStore, namespace) {
        return this.fromKeyv({ store: keyvStore, namespace });
    }

    /**
     * Determines whether a filepath represents a SIFDB file.
     * @param {String} path - The filepath
     * @returns {boolean}
     */
    static isSifStore(path) {
        return typeof path === 'string' && path?.endsWith(".sifdb");
    }

    /**
     * Determines whether a filepath represents a JSON file.
     * @param {String} path - The filepath
     * @returns {boolean}
     */
    static isJsonStore(path) {
        return typeof path === 'string' && path?.endsWith(".json");
    }

    /**
     * Asynchronously waits for the provided time in milliseconds, or the optimal time for JSON/SIFDB operations if a time is not specified.
     * Can be used along with Array set operations to access database values immediately after setting them.
     * 
     * @example
     * db.asArray()[0] = "value";
     * db.await();
     * db.asArray()[0] // => "value"
     * 
     * @param {Number} [ms] - Milliseconds to wait. By default, this is the optimal time to wait for JSON/SIFDB database operations.
     */
    static async await(ms) {
        return new Promise(resolve => setTimeout(resolve, ms ?? 200));
    }

    /**
     * Opens the specified namespace within the database.
     * This method can only be used on Sifbase instances that do not already have a namespace open.
     * @param {String} namespace - The namespace, i.e. a table in the database, to open.
     * @returns {Sifbase} - A new Sifbase instance with the specified namespace.
     */
    table(namespace) {
        if (!namespace) return this.#namespace;
        if (this.#namespace) throw new Error("Namespace already set. Sifbase#table() cannot be used on a Sifbase object with namespace already specified.");
        return new Sifbase(this.#path, namespace);
    }

    /**
     * Asynchronously gets a value from the database.
     * @param {String} key
     * @param {*} defaultValue - A default value to return if the key is not found in the database.
     * @param {Object} opts - Retrieval options for Keyv.
     */
    async get(key, defaultValue, opts = undefined) {
        const value = await this.#keyv.get(key, opts) ?? defaultValue;
        this.cache.set(key, value);
        return value;
    }

    /**
     * Asynchronously determines if a key is in the database.
     * @param {String} key 
     * @returns {Promise<boolean>} Whether the key is in the database.
     */
    async has(key) {
        return await this.get(key) !== undefined ? true : false;
    }

    /**
     * Asynchronously sets a value in the database.
     * @param {String} key 
     * @param {*} value 
     * @param {Number} [expirationTime] - The optional number of milliseconds until the entry expires and is removed from the database.
     */
    async set(key, value, expirationTime) {
        this.cache.set(key, value);
        return await this.#keyv.set(key, value, expirationTime);
    }

    /**
     * Asynchronously deletes a key from the database.
     * @param {String} key 
     */
    async delete(key) {
        this.cache.delete(key);
        return await this.#keyv.delete(key);
    }

    /**
     * Asynchronously clears the database.
     */
    async clear() {
        this.cache.clear();
        return await this.#keyv.clear();
    }

    /**
     * Asynchronously returns a utility to manage the contents of the database as an array, instead of an object.
     * @returns {ArrayManager}
     */
    async asArray() {
        return await ArrayManager.from(this);
    }

    /**
     * Asynchronously imports the contents of a provided JSON file into the database.
     * @param {String|Object} filepath - Absolute path to the JSON file, OR a pre-parsed JSON object.
     * @param {boolean} deleteAfterImport - Whether to delete the JSON file after importing.
     * @returns {Promise<this>}
     */
    async importJSON(filepath, deleteAfterImport) {
        if (typeof filepath === "string" && !fs.existsSync(filepath)) return this;
    
        const json = typeof filepath === "string" ? JSON.parse(fs.readFileSync(filepath)) : filepath;

        if (typeof json === "object" && !Array.isArray(json)) {
            for (const key in json) {
                await this.set(key, json[key]);
            }
        }
        else if (Array.isArray(json)) {
            const arr = await this.asArray();
            for (const item of json) {
                await arr.push(item);
            }
        }

        //Check if file at filepath exists again, to be safe
        if (deleteAfterImport && fs.existsSync(filepath)) {
            try {
                fs.unlinkSync(filepath);
            }
            catch (err) {
                //File already deleted.
                //Catch the error
                console.log("An error occurred when deleting a JSON file.");
            }
        }

        return this;
    }

    /**
     * Asynchronously imports the contents of a provided SIFDB file into the database.
     * @param {String} filepath - Absolute path to the SIFDB file.
     * @param {boolean} deleteAfterImport - Whether to delete the SIFDB file after importing.
     * @returns {Promise<this>}
     */
    async importSIFDB(filepath, deleteAfterImport) {
        if (filepath instanceof module.exports.SIFDB) return this.importJSON(filepath.toJSON(), deleteAfterImport);
        if (typeof filepath !== "string" || !fs.existsSync(filepath)) return this;
        const json = module.exports.SIFDB.import(filepath);
        return this.importJSON(json, deleteAfterImport);
    }

    // Iterators:

    iterator() {
        if (!this.#keyv.iterator) {
            console.warn("Warning: This database type does not support iterators.");
            return [];
        }

        return this.#keyv.iterator();
    }

    async *[Symbol.asyncIterator]() {
        for await (const [k,v] of this.iterator()) yield [k,v];
    }

    *[Symbol.iterator]() {
        for (const [k,v] of this.cache.entries()) yield [k,v];
    }

    async keys() {
        const keys = [];
        for await (const [key] of this.iterator()) keys.push(key);
        return keys;
    }

    async values() {
        const values = [];
        for await (const [_, value] of this.iterator()) values.push(value);
        return values;
    }

}