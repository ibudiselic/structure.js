describe("HashTable", function() {
  var HashTable = require("../lib/structure.js").HashTable;
  var H;

  beforeEach(function() {
    H = new HashTable();
    constH = new HashTable({
      hash: function(obj) { return 0; }
    });
  });

  it("implements the put-get-remove API", function() {
    H.put("a", 1);
    expect(H.get("a")).toBe(1);
    H.remove("a");
    expect(H.get("a")).toBe(undefined);
  });

  describe("put", function() {
    it("adds the provided key-value pair to the table", function() {
      H.put(1, "a");
      expect(H.get(1)).toEqual("a");
    });

    it("accepts any type of object for key and value", function() {
      H.put({}, "xyz");
      expect(H.get({})).toEqual("xyz");

      H.put({a: 1}, [1, 2, 3]);
      //expect(areEquivalent(H.get({a: 1}), [1, 2, 3])).toBeTruthy();

      H.put({x: "abc", y: 10}, 321);
      expect(H.get({y: 10, x: "abc"})).toBe(321);
    });

    it("replaces the old value with the new one if the given key is already in the table",
        function() {
      H.put({}, "a");
      expect(H.get({})).toEqual("a");
      H.put({}, "b");
      expect(H.get({})).toEqual("b");

      H.put(123, "a");
      expect(H.get(123)).toEqual("a");
      H.put(123, "b");
      expect(H.get(123)).toEqual("b");
    });

    it("throws if the key or value equal undefined", function() {
      expect(function() { H.put(undefined, 1); }).toThrow();
      expect(function() { H.put(1, undefined); }).toThrow();
    });

    it("works for a constant hash function", function() {
      var i;
      for (i=0; i<10; i++) {
        constH.put(i, i + 10);
      }
      for (i=0; i<10; i++) {
        expect(constH.get(i)).toEqual(i + 10);
      }
    });
  });

  describe("get", function() {
    it("returns the value associated with the given key", function() {
      H.put(123, 321);
      expect(H.get(123)).toBe(321);
    });

    it("returns undefined if there is no key-value pair with the given key", function() {
      expect(H.get(123)).toBe(undefined);
      expect(H.get("123")).toBe(undefined);
      expect(H.get([123])).toBe(undefined);
    });

    it("throws if the passed key equals undefined", function() {
      expect(function() { H.get(undefined); }).toThrow();
    });
  });

  describe("remove", function() {
    it("removes the key-value pair with the given key from the table", function() {
      H.put(123, 321);
      expect(H.get(123)).toBe(321);
      H.remove(123);
      expect(H.get(123)).toBe(undefined);
    });

    it("does nothing if there is no key-value pair with the given key", function() {
      expect(function() { H.remove(123); }).not.toThrow();
    });

    it("throws if the passed key equals undefined", function() {
      expect(function() { H.remove(undefined); }).toThrow();
    });

    it("works for a constant hash function", function() {
      for (var i=0; i<3; i++) {
        constH.put(i, i + 10);
      }
      constH.remove(1);
      expect(constH.get(0)).toEqual(10);
      expect(constH.get(1)).toBe(undefined);
      expect(constH.get(2)).toEqual(12);
    });
  });
});
