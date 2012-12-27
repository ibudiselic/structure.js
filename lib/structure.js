/*
 * structure.js - JavaScript library of useful data structures.
 * https://github.com/ibudiselic/structure.js
 *
 * Copyright 2012 Ivan Budiselic
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (structure) {

  /*
   * Expose the module to the 'world' when loaded via CommonJS/NodeJS, 
   * AMD and <script> tags.
   */

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = structure; // NodeJS
  }
  
  if (typeof exports !== 'undefined' && typeof exports !== "function") {
    exports.noam = structure; // CommonJs
  }

  if (typeof define === "function" && define.amd) {
    define('structure', [], function () { return structure; } ); // AMD
  }

  if (typeof window !== 'undefined') {
    window.structure = structure;  // <script>
  }

}((function () {
  var structure = {};

  /* General purpose hashtable implementation.
   * Note that all the performance guarantees assume (as usual for hashtables) that
   *    1) hashing keys is O(1)
   *    2) comparing keys for equality is O(1)
   *    3) array access in JS is O(1)
   * In other words, the guarantees specify the number of these
   * three operations for any hashtable operation, rather than
   * actual time.
   */
  (function() {
    var CAPACITY_CHOICES = [5, 11, 23, 47, 97, 197, 397, 797, 1597, 3203, 6421, 12853,
        25717, 51437, 102877, 205759, 411527, 823117, 1646237, 3292489, 6584983,
        13169977, 26339969, 52679969, 105359939];

    var DEFAULT_INITIAL_CAPACITY_IDX = 0;
    var HASH_MASK = (1<<31) - 1; // keeps everything nonnegative int32
    var LF_HIGH = 0.75; // load factor upper limit
    var LF_LOW = 0.25; // load factor lower limit

    // See http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
    function _isArray(obj) {
      return Object.prototype.toString.call(obj) === "[object Array]";
    }

    function _get_capacity_index(wanted) {
      wanted = Math.max(wanted, CAPACITY_CHOICES[0]);
      wanted = Math.min(wanted, CAPACITY_CHOICES[CAPACITY_CHOICES.length-1]);
      var lo = 0;
      var hi = CAPACITY_CHOICES.length - 1;
      var mid;
      // binary search for the smallest capacity no smaller than wanted
      while (lo < hi) {
        mid = lo + Math.floor((hi-lo)/2);
        if (CAPACITY_CHOICES[mid] >= wanted) {
          hi = mid;
        } else {
          lo = mid + 1;
        }
      }
      return lo;
    }

    // TODO: needs serious testing
    function _defaultHash(obj) {
      var h, i;
      if (obj === undefined) { // undefined might be a "value" of some property
        return 12345; // arbitrary constant
      }
      if (obj === null) {
        return 54321; // arbitrary constant
      }
      if (typeof obj==="boolean" || typeof obj==="number") {
        return obj & HASH_MASK;
      }
      if (typeof obj==="string") {
        h = 5381;
        for (i=0; i<obj.length; i++) {
          h = ((h*33) ^ obj.charCodeAt(i)) & HASH_MASK;
        }
        return h;
      }
      if (_isArray(obj)) {
        h = 6421;
        for (i=0; i<obj.length; i++) {
          h = ((h*37) ^ _defaultHash(obj[i])) & HASH_MASK;
        }
        return h;
      }

      // objects
      var props = [];
      for (i in obj) {
        if (!(obj.hasOwnProperty(i))) {
          continue;
        }
        props.push(i);
      }
      props.sort(); // sort them so that logically equal object get the same hash

      h = 3203;
      for (i=0; i<props.length; i++) {
        // hash both the property name and its value
        h = ((((h*39) ^ _defaultHash(props[i])) * 43) ^ _defaultHash(obj[props[i]])) & HASH_MASK;
      }
      return h;
    }

    // "deep" compare of two objects
    // taken from http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
    function _defaultEquals(object1, object2) {
      if (object1 === object2) {
        return true;
      }

      if (object1 instanceof Date && object2 instanceof Date) {
        return object1.getTime() === object2.getTime();
      }

      if (object1 instanceof RegExp && object2 instanceof RegExp) {
        return object1.source === object2.source &&
               object1.global === object2.global &&
               object1.multiline === object2.multiline &&
               object1.lastIndex === object2.lastIndex &&
               object1.ignoreCase === object2.ignoreCase;
      }

      if (!(object1 instanceof Object) || !(object2 instanceof Object) ) {
        return false;
      }

      if (typeof object1 === 'undefined' || typeof object2 === 'undefined') {
        return false;
      }

      if (object1.constructor !== object2.constructor) {
        return false;
      }

      for (var p in object1) {
        if (!(p in object2)) {
          return false;
        }

        if (object1[p] === object2[p]) {
          continue;
        }

        if (typeof(object1[p]) !== "object") {
          return false;
        }

        if (!(_defaultEquals(object1[p], object2[p]))) {
          return false;
        }
      }

      for (p in object2) {
        if (!(p in object1)) {
          return false;
        }
      }

      return true;
    }

    /* Constructor for hash chain nodes.
     *
     * Each node has three properties:
     *  - key: the key of the key-value pair
     *  - value: the value of the key-value pair
     *  - next: either another _HashChainNode or undefined if this is the last node
     *          of the chain
     */
    function _HashChainNode(key, value) {
      this.key = key;
      this.value = value;
    }

    /* Constructor for an empty hash chain used for collision resolution.
     *
     * Every _HashChain has just one property:
     *  - head: the first _HashChainNode of the chain or undefined if the chain is
     *          empty
     */
    function _HashChain() {
      // intentionally empty
    }

    // Returns true iff the chain is empty.
    _HashChain.prototype.isEmpty = function() {
      return this.head === undefined;
    };

    // Adds the new node to the front of the chain.
    _HashChain.prototype.insertHead = function(node) {
      node.next = this.head;
      this.head = node;
    };

    /* Removes the successor of @a node from the chain. It is assumed that
     * the successor exists.
     *
     * If @a node equals undefined, removes the head of the chain.
     */
    _HashChain.prototype.removeSuccessor = function(node) {
      if (node === undefined) {
        this.head = this.head.next;
      } else {
        node.next = node.next.next;
      }
    };

    /* Inserts the key-value pair into the chain.
     * @a H is the HashTable that contains this chain.
     *
     * Returns true iff @a key is a new key that was not previously in the table.
     */
    _HashChain.prototype.put = function(H, key, value) {
      // first search for the key
      var iter = this.iterator();
      while (iter.hasNext()) {
        var node = iter.next();
        if (H.equals(key, node.key)) {
          // old key; just replace the value
          node.value = value;
          return false;
        }
      }
      // new key
      this.insertHead(new _HashChainNode(key, value));
      return true;
    };

    /* Returns the value associated with @a key in the chain or undefined
     * if @a key is not found in the chain.
     */
    _HashChain.prototype.get = function(H, key) {
      var iter = this.iterator();
      while (iter.hasNext()) {
        var node = iter.next();
        if (H.equals(key, node.key)) {
          return node.value;
        }
      }
      return undefined;
    };

    /* Removes the key-value pair with the given key from the chain. Does nothing
     * if there is no key-value pair with the given key in the chain.
     *
     * Returns true iff a key-value pair was actually removed.
     */
    _HashChain.prototype.remove = function(H, key) {
      var iter = this.iterator();
      var prev; // intentionally undefined
      while (iter.hasNext()) {
        var node = iter.next();
        if (H.equals(key, node.key)) {
          this.removeSuccessor(prev);
          return true;
        }
        prev = node;
      }
      return false;
    };

    /* Constructor for a hash chain iterator.
     *
     * Every iterator has two methods:
     *  - hasNext: returns true iff there is another node in the chain
     *  - next: returns the next node in the chain or throws if the iterator is
     *          exhausted
     *
     * If the hash chain changes in any way between the construction of the
     * iterator and a call to one of its methods, the behavior is undefined.
     */
    function _HashChainIterator(chain) {
      this.node = chain.head;
    }
    _HashChainIterator.prototype.hasNext = function() {
      return this.node !== undefined;
    };
    _HashChainIterator.prototype.next = function() {
      if (!this.hasNext()) {
        throw new Error("HashTable internal error: " +
            "called _HashChainIterator.next on exhausted iterator");
      }
      var retval = this.node;
      this.node = retval.next;
      return retval;
    };

    // Returns a new iterator for the hash chain.
    _HashChain.prototype.iterator = function() {
      return new _HashChainIterator(this);
    };


    /* Resizes the HashTable @a H to have capacity CAPACITY_CHOICES[to_cap_idx].
     * Throws if @a to_cap_idx >= CAPACITY_CHOICES.length.
     * Does nothing if @a to_cap_idx < 0, i.e. the HashTable never decreases below
     * CAPACITY_CHOICES[0] capacity.
     *
     * Takes O(n) time where n is the number of mappings in the HashTable.
     */
    function _resize(H, to_cap_idx) {
      if (to_cap_idx >= CAPACITY_CHOICES.length) {
        throw new Error("Capacity of HashTable can't grow beyond " + CAPACITY_CHOICES[CAPACITY_CHOICES.length - 1]);
      }
      if (to_cap_idx >= 0) {
        var old_cap = H.capacity;
        var old_slots = H.slots;

        H.capacity_index = to_cap_idx;
        H.capacity = CAPACITY_CHOICES[to_cap_idx];
        H.slots = [];
        for (var i=0; i<old_cap; i++) {
          if (old_slots[i] !== undefined) {
            var chain_iter = old_slots[i].iterator();
            while (chain_iter.hasNext()) {
              H._putNodeRsz(chain_iter.next());
            }
          }
        }
      }
    }

    // Returns the slot index for @a key in the hashtable @a H.
    function _getSlotIndex(H, key) {
      return H.hash(key) % H.capacity; // division method
    }

    /* Constructor for HashTable. To create an empty HashTable, do something like
     * var H = new structure.HashTable();
     *
     * @a cfg is optional and can contain any or all of the following properties
     *    - initial_capacity: a number that is a hint for the initial capacity
     *        - defaults to an implementation defined number
     *    - hash: a function that takes an object and returns a nonnegative 32-bit integer
     *        - the usual requirements for this function apply
     *           - it must be consistent, i.e. return the same value for the same object
     *             (if the object doesn't change)
     *           - if two objects are equal by the client's definition of equality,
     *             this function must return the same value for both of them
     *        - defaults to _defaultHash
     *   - equals: a function that takes two objects and returns true iff they are logically equal
     *        - the usual requirements for this function apply
     *           - it must be reflexive, symmetric and transitive
     *           - it must be consistent i.e. return the same value for unchanged arguments every
     *             time it's called
     *        - defaults to _defaultEqauls
     *
     * If you provide either hash or equals, you probably want to provide both
     */
    structure.HashTable = function(cfg) {
      this.capacity_index = DEFAULT_INITIAL_CAPACITY_IDX;
      if (cfg) {
        if (cfg.initial_capacity) {
          this.capacity_index = _get_capacity_index(cfg.initial_capacity);
        }
        if (cfg.hash) { // otherwise we use the prototype one
          this.hash = cfg.hash;
        }
        if (cfg.equals) { // otherwise we use the prototype one
          this.equals = cfg.equals;
        }
      }

      // this is redundan't information, but keeps code somewhat cleaner
      this.capacity = CAPACITY_CHOICES[this.capacity_index];
      this.numkeys = 0; // start out empty

      // we will use undefined as the indicator for empty slots so
      // we don't actually need to "allocate" the capacity because
      // JS arrays don't actually have bounds and a[i] returns
      // undefined if the ith element is "out of bounds"...
      // however, take care to never use this.slots.length as it will
      // be meaningless
      this.slots = [];

      if (typeof WeakMap !== "undefined" && Object.observe) {
        // use a WeakMap for storing an object's slot index so that it is removed
        // if the object is not used anymore
        this.slot_indices = new WeakMap();

        // wrapper for _observe function which is needed since V8 implementation of
        // observer is buggy
        this.wrapper = function(me) {
          return function(param) {
            me._observe(param);
          };
        }(this);
      }
    };

    // defaults for hash and equals
    structure.HashTable.prototype.hash = _defaultHash;
    structure.HashTable.prototype.equals = _defaultEquals;

    // Returns the load factor of the HashTable, i.e. the ratio
    // of occupied slots to the capacity.
    structure.HashTable.prototype.loadFactor = function() {
      return this.numkeys / this.capacity;
    };

    /* Add the key-value pair to the HashTable.
     * Throws if @a key or @a value equals undefined.
     *
     * Takes O(1) time amortized, assuming uniform hashing.
     *
     * Only references to the key and value are stored, i.e. the client must do defensive
     * copies if they are required. If the key is mutable and changes after this operation
     * is performed, the behavior is undefined (the HashTable will most likely become
     * invalid and unpredictibly useless).
     * Changes to the value object are allowed but are in most situations probably
     * an indicator of bad design.
     */
    structure.HashTable.prototype.put = function(key, value) {
      if (key === undefined) {
        throw new Error("called HashTable.put with key === undefined");
      }

      if (value === undefined) {
        throw new Error("called HashTable.put with value === undefined");
      }

      if (typeof WeakMap !== "undefined" && Object.observe) {
        Object.deliverChangeRecords(this.wrapper);
        Object.observe(key, this.wrapper);
      }

      var h = _getSlotIndex(this, key);

      if (typeof WeakMap !== "undefined" && Object.observe) {
        this.slot_indices.set(key, h);
      }

      if (this.slots[h] === undefined) {
        this.slots[h] = new _HashChain();
      }

      if (this.slots[h].put(this, key, value)) {
        ++this.numkeys;
        if (this.loadFactor() > LF_HIGH) {
          _resize(this, this.capacity_index + 1);
        }
      }
    };

    // if an observed object has changed in any way
    //   then recompute its hash and put it in the new place
    //   in the hashtable by removing it and adding it again
    structure.HashTable.prototype._observe = function(changes) {
      var changed_obj, value, hash, slot, updated_objs = new Set();
      for (var i=0; i<changes.length; i++) {
        changed_obj = changes[i].object;

        if (updated_objs.has(changed_obj)) {
          continue;
        } else {
          updated_objs.add(changed_obj);
        }

        hash = this.slot_indices.get(changed_obj);
        slot = this.slots[hash];

        if (slot === undefined) {
          return;
        }

        value = slot.get(this, key);
        slot.remove(this, key);
        hash = _getSlotIndex(this, changed_obj);

        if (this.slots[hash] === undefined) {
          this.slots[hash] = new _HashChain();
        }

        this.slots[hash].put(this, changed_obj, value);
        this.slot_indices.set(changed_obj, hash);
      }
    };

    /* This is an internal put method that reuses existing _HashChainNode objects
     * to reduce garbage generation when the table gets resized.
     *
     * Don't use this outside of resizing functionality!
     */
    structure.HashTable.prototype._putNodeRsz = function(node) {
      // we don't check the validity of node.key and node.value because
      // it is assumed they are valid as they are already in a preexisting node
      var h = _getSlotIndex(this, node.key);

      if (typeof WeakMap !== "undefined" && Object.observe) {
        this.slot_indices.set(node.key, h);
      }

      if (this.slots[h] === undefined) {
        this.slots[h] = new _HashChain();
      }
      // don't need to actually iterate the chain to search for matching keys
      // because we know that the keys were unique prior to resizing
      this.slots[h].insertHead(node);
      // we don't check the load factor because we know that we have just
      // recently resized so no further resizing will be needed
    };

    /* Returns the value associated with @a key in the HashTable or
     * undefined if @a key is not found.
     *
     * Throws if @a key equals undefined.
     *
     * Takes O(1) time, assuming uniform hashing.
     */
    structure.HashTable.prototype.get = function(key) {
      if (key === undefined) {
        throw new Error("called HashTable.get with key === undefined");
      }

      if (typeof WeakMap !== "undefined" && Object.observe) {
        Object.deliverChangeRecords(this.wrapper);
        Object.observe(key, this.wrapper);
      }

      var h = _getSlotIndex(this, key);
      var slot = this.slots[h];

      if (slot === undefined) {
        return undefined;
      } else {
        return slot.get(this, key);
      }
    };

    /* Removes @a key from the HashTable. If @a key is not in the HashTable,
     * this operation does nothing.
     *
     * Throws if @a key equals undefined.
     *
     * Takes O(1) time ammortized, assuming uniform hashing.
     */
    structure.HashTable.prototype.remove = function(key) {
      if (key === undefined) {
        throw new Error("called HashTable.remove with key === undefined");
      }

      if (typeof WeakMap !== "undefined" && Object.observe) {
        Object.deliverChangeRecords(this.wrapper);
        Object.observe(key, this.wrapper);
      }

      var h = _getSlotIndex(this, key);
      var slot = this.slots[h];

      if (slot === undefined) {
        return;
      }

      if (slot.remove(this, key)) {
        --this.numkeys;
        if (this.loadFactor() < LF_LOW) {
          _resize(this, this.capacity_index - 1);
        }
      }

      if (typeof WeakMap !== "undefined" && Object.observe) {
        this.slot_indices.delete(key);
      }
    };

    // Returns true iff the HashTable is empty.
    // O(1) time.
    structure.HashTable.prototype.isEmpty = function() {
      return this.numkeys === 0;
    };

    // Clears the HashTable, making it empty.
    // O(1) time.
    structure.HashTable.prototype.clear = function() {
      this.capacity_index = DEFAULT_INITIAL_CAPACITY_IDX;
      this.capacity = CAPACITY_CHOICES[this.capacity_index];
      this.numkeys = 0;
      this.slots = [];

      if (typeof WeakMap !== "undefined" && Object.observe) {
        this.slot_indices = new WeakMap();
      }
    };

    // Returns the number of mappings in the HashTable.
    // O(1) time.
    structure.HashTable.prototype.size = function() {
      return this.numkeys;
    };

    // Returns true iff @a key is in the HashTable.
    // Equivalent to get(key) !== undefined.
    structure.HashTable.prototype.containsKey = function(key) {
      if (key === undefined) {
        throw new Error("called HashTable.containsKey with key === undefined");
      }

      return this.get(key) !== undefined;
    };

    // Returns an array with all the keys in the HashTable
    structure.HashTable.prototype.keys = function() {
      var keys = [];

      for (var it = this.keyIterator(); it.hasNext(); ) {
        keys.push(it.next());
      }

      return keys;
    };

    // Returns an array with all the values in the HashTable
    structure.HashTable.prototype.values = function() {
      var values = [];

      for (var it = this.valueIterator(); it.hasNext(); ) {
        values.push(it.next());
      }

      return values;
    };

    // Returns an array with all the key-value pairs in the HashTable
    structure.HashTable.prototype.entries = function() {
      var entries = [];

      for (var it = this.keyValueIterator(); it.hasNext(); ) {
        entries.push(it.next());
      }

      return entries;
    };

    // Iterators internals. The API is below.
    var Iterator = {
      hasNext: function() {
        // first try the current chain iterator
        if (this.cur_chain_iterator!==undefined && this.cur_chain_iterator.hasNext()) {
          return true;
        }
        if (this.cur_chain_iterator !== undefined) {
          ++this.idx; // this chain iterator was exhausted
        }
        // try to find another chain
        while (this.idx<this.H.capacity &&
            (this.H.slots[this.idx]===undefined || // no chain OR
             this.H.slots[this.idx].isEmpty())) {  // empty chain
          ++this.idx;
        }
        var slotval = this.H.slots[this.idx];
        if (slotval === undefined) { // no more chains in the table
          this.cur_chain_iterator = undefined;
          return false;
        }
        this.cur_chain_iterator = slotval.iterator();
        return true; // we know this chain isn't empty so just return true
      },
      // @a err_msg is the message to throw if the iterator is empty
      // @a extract_next is a function that takes the iterator as its only
      // parameter and returns the required item
      _next: function(err_msg, extract_next) {
        if (!this.hasNext()) {
          throw new Error(err_msg);
        }
        //assert(this.H.keys[this.idx] !== undefined);
        var retval = extract_next(this);
        return retval;
      },
      // invoke function @a iterator_func with context @a context on each
      // element of the iterable collection
      each: function(iterator_func, context) {
        if (iterator_func === undefined) {
          throw new Error("called iterator.each with iterator_func === undefined");
        }

        for (var i=0, it = this; this.hasNext(); i++) {
          iterator_func.call(context, this.next(), i, this.H);
        }
      }
    };

    function _KeyIterator(H) {
      this.idx = 0;
      this.H = H;
    }
    _KeyIterator.prototype = Object.create(Iterator);
    _KeyIterator.prototype.next = function() {
      return this._next("KeyIterator.next called on empty iterator", function(it) {
        return it.cur_chain_iterator.next().key;
      });
    };

    function _ValueIterator(H) {
      this.idx = 0;
      this.H = H;
    }
    _ValueIterator.prototype = Object.create(Iterator);
    _ValueIterator.prototype.next = function() {
      return this._next("ValueIterator.next called on empty iterator", function(it) {
        return it.cur_chain_iterator.next().value;
      });
    };

    function _KeyValueIterator(H) {
      this.idx = 0;
      this.H = H;
    }
    _KeyValueIterator.prototype = Object.create(Iterator);
    _KeyValueIterator.prototype.next = function() {
      return this._next("KeyValueIterator.next called on empty iterator", function(it) {
        var node = it.cur_chain_iterator.next();
        return [node.key, node.value];
      });
    };

    /* Iterator API
     *
     * HashTable supports three iterators for iteration over keys, values
     * and key-value pairs.
     * The iterator is returned by the appropriate *Iterator
     * function on the hashtable. All three iterators have two methods
     *   - hasNext: Returns true iff there is at least one more item to iterate over.
     *   - next: Returns the next item from the iterator, or throws if the iterator is
     *           exhausted. It is guaranteed that next does not throw if a preceeding
     *           call to hasNext returned true.
     *   - each: Iterates over all elements in the collection, invoking a function on
     *           each element. The function is passed a reference to the element, the
     *           index of the element and a reference to the hashtable.
     *
     * If the HashTable changes in any way during iteration (e.g. by calling put, remove or clear),
     * the iterator is invalidated and the behavior of subsequent calls to hasNext or next is undefined.
     *
     * All three iterators iterate over the whole HashTable in O(n) time where n is the number of mappings
     * in the table.
     *
     * The KeyValueIterator's next method returns arrays of length two where the first element is the key
     * and the second element is the value.
     */
    structure.HashTable.prototype.keyIterator = function() {
      return new _KeyIterator(this);
    };
    structure.HashTable.prototype.valueIterator = function() {
      return new _ValueIterator(this);
    };
    structure.HashTable.prototype.keyValueIterator = function() {
      return new _KeyValueIterator(this);
    };

  })();

  return structure;
}())));
