
module.exports = class ArrayManager {

    indexes;
    #sifbase;

    /**
     * @param {Number[]} indexes - An array of indexes.
     * @param {Sifbase} sifbase - A sifbase instance.
     */
    constructor(indexes, sifbase) {
        
        this.indexes = new Set(indexes);
        this.#sifbase = sifbase;

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (!(prop in target) && !isNaN(prop) && !prop.match("#")) return target.get(prop);
                else if (prop == Symbol.iterator) return function*() {
                    for (const index of target.indexes) {
                        yield target.get(index);
                    }
                };
                const getter = Reflect.get(target, prop, receiver);
                return typeof getter === "function" ? getter.bind(target) : getter;
            },
            set(target, prop, value, _receiver) {
                if (!(prop in target) && !isNaN(prop) && !prop.match("#")) return target.set(prop, value);
                if (prop == "indexes") Reflect.set(target, prop, value, receiver);
                throw new Error("Cannot modify base property " + prop + " on Sifbase.ArrayManager object.");
                // const setter = Reflect.set(target, prop, value, receiver);
                // return typeof setter === "function" ? setter.bind(target) : setter;
            }
        });

    }

    /**
     * Asynchronously constructs an ArrayManager from an existing Sifbase object.
     * @param {Sifbase} sifbase - The Sifbase instance.
     * @returns {ArrayManager}
     */
    static async from(sifbase) {
        let indexes = await sifbase.get("indexes");
        if (!indexes) {
            indexes = [];
            await sifbase.set("indexes", indexes);
        }
        return new this(indexes, sifbase);
    }

    /**
     * Constructs an ArrayManager from an existing Map object.
     * @param {Map} map - The Map object, or any object implementing the Map interface.
     * @returns {ArrayManager}
     */
    static fromRawMap(map) {
        const arr = [];
        for (const [key, value] of map.entries()) {
            arr[key] = value;
        }
        return arr;
    }

    /**
     * The last index in the array.
     */
    get lastIndex() {
        return [...this.indexes.values()].slice(-1)[0] ?? -1;
    }

    /**
     * Asynchronously determines whether the array contains the given index.
     * @param {Number} index 
     * @returns {boolean}
     */
    async has(index) {
        return this.indexes.has(Number(index));
    }

    /**
     * Asynchronously gets the value at the given index from the array.
     * @param {Number} index 
     * @param {*} defaultValue - Default value to return if a value is not found.
     */
    async get(index, defaultValue) {
        if (isNaN(index)) throw new Error("Index must be a number.");
        const key = await this.has(index);
        if (!key) return undefined;
        return this.#sifbase.get(index, defaultValue);
    }

    /**
     * Asynchronously sets the value of the given index of the array.
     * @param {Number} index 
     * @param {*} value 
     */
    async set(index, value) {
        if (isNaN(index)) throw new Error("Index must be a number.");
        const key = await this.has(index);
        if (!key) {
            this.indexes.add(Number(index));
            this.indexes = new Set([...this.indexes.values()].sort((a, b) => a - b));
            await this.#sifbase.set("indexes", [...this.indexes.values()]);
        }
        return this.#sifbase.set(index, value);
    }

    /**
     * Asynchronously deletes the value at the given index from the array.
     * @param {Number} index 
     */
    async delete(index) {
        if (isNaN(index)) throw new Error("Index must be a number.");
        const key = await this.has(index);
        if (!key) return false;
        this.indexes.delete(Number(index));
        
        const indexes = [];
        for (let i of this.indexes) {
            if (i > Number(index)) {
                const val = await this.get(i--);
                await this.set(i, val);
            }

            if (!indexes.some(v => v == i)) indexes.push(i);
        }
        for (const i of this.indexes) !indexes.some(v => v == i) ? await this.#sifbase.delete(i) : null;
        this.indexes = new Set(indexes);

        await this.#sifbase.set("indexes", [...this.indexes.values()]);
    }

    /**
     * Asynchronously clears the array.
     */
    async clear() {
        await this.#sifbase.clear();
        this.indexes.clear();
        await this.#sifbase.set("indexes", []);
    }

    /**
     * Asynchronously pushes a value into the array.
     * @param {*} value 
     */
    async push(value) {
        const index = (this.lastIndex) + 1;
        return this.set(index, value);
    }

    /**
     * Asynchronously removes the given amount of values from the array, starting at the given index.
     * @param {Number} index - Index to start removing values at, inclusive.
     * @param {Number} [amount] - Amount of values to remove, starting from the index. Defaults to 1.
     */
    async splice(index, amount = 1) {
        if (isNaN(index)) throw new Error("Index must be a number.");
        if (isNaN(amount)) throw new Error("Amount must be a number.");
        for (let i = index; i < index + amount; i++) {
            if (this.indexes.has(index)) await this.delete(index);
        }
    }

    /**
     * Asynchronously finds a value matching the given filter function.
     * @param {Function} callback
     */
    async find(callback) {
        return (await this.filter(callback, 1))[0];
    }

    /**
     * Asynchronously finds the index of a value matching the given filter function.
     * @param {Function} callback 
     * @returns {Number}
     */
    async findIndex(callback) {
        const item = await this.find(callback);
        if (!item) return -1;

        for (const index of this.indexes) {
            if (await this.get(index) == item) return index;
        }

        throw new Error("Unable to find index of item: " + item);
    }

    /**
     * Asynchronously determines whether there is at least one item in the array that passes the given filter function.
     * @param {Function} callback 
     * @returns {boolean}
     */
    async some(callback) {
        return await this.find(callback) !== undefined ? true : false;
    }

    /**
     * Asynchronously determines whether all items in the array pass the given filter function.
     * @param {Function} callback 
     * @returns {boolean}
     */
    async every(callback) {
        return (await this.filter(callback)).length == this.indexes.size;
    }

    /**
     * Asynchronously filters the array using the given filter function.
     * @param {Function} callback 
     * @param {Number} iterations 
     * @returns {Array}
     */
    async filter(callback, iterations = this.indexes.size) {
        const items = [];
        iterations += 1;
        for (const index of this.indexes) {
            if (items.length >= iterations) break;
            const item = await this.get(index);
            if (callback(item, index)) items.push(item);
        }

        return items;
    }

    /**
     * Returns a raw array derived from the contents of this ArrayManager.
     * @returns {Array}
     */
    async toRawArray() {
        return this.filter(() => true);
    }

    /**
     * Asynchronously maps the array using the given callback function.
     * @param {Function} callback 
     * @returns {Array}
     */
    async map(callback) {
        const items = [];
        for (const index of this.indexes) {
            items.push(await callback(await this.get(index), index));
        }
        return items;
    }

    /**
     * Asynchronously calls a callback function on every item in the array.
     * @param {Function} callback 
     */
    async forEach(callback) {
        await this.map(callback);
    }

    /**
     * Asynchronously slices the array starting and ending at the specified indexes.
     * @param {Number} start - Starting index, inclusive.
     * @param {Number} end - Ending index, exclusive.
     * @returns {Array}
     */
    async slice(start, end) {
        if (!start) start = this.lastIndex + 1;
        if (!end) [start, end] = [0, start];
        return this.filter((_item, i) => i >= start && i < end);
    }

    /**
     * @returns The first element of the array.
     */
    async first() {
        return this.get([...this.indexes.values()][0] || 0);
    }

    /**
     * @returns The last element of the array.
     */
    async last() {
        return this.get(this.lastIndex);
    }

    /**
     * Asynchronously concatenates/adds the given items and iterable items to the array.
     * @param  {...any} items 
     */
    async concat(...items) {
        const result = [].concat(...items);
        for (const item of result) {
            await this.push(item);
        }
    }

    /**
     * Asynchronously reverses the contents of the array, without modifying the contents of the original array.
     * @returns {Array}
     */
    async reverse() {
        return (await this.toRawArray()).reverse();
    }

    /**
     * Asynchronously returns the length of the array.
     */
    get length() {
        return this.indexes.size;
    }

}