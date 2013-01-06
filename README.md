# Structure.js

Structure.js is a JavaScript library of useful data structures.

## Status

Early stages of development.
Currently contains only a hash table. Stay tuned for more.

## Usage

### Node

Install it using npm:

    npm install structure.js

or add `structure.js` as a dependency to your `package.json` file.

Then you import the module through `require('structure.js')`, as usual.

### Browser

Add a script tag with the `lib/structure.min.js` file. It will define the `structure` property on `window`.

### Inlining

You can use `lib/inline-*` to inline the code into some file using grunt or a similar tool. The code will define the `structure` object and populate it with the data structures (for example, if you inline `lib/inline-hashtable.js`, you'll get `structure.HashTable`).

To get the code into your project in the first place, you'll probably want to use npm like above.

## Intended use comments

### HashTable

This is not your Java HashMap - you certainly don't want to use it "everywhere". However, if you need to preserve a large number of mappings for keys other than strings and numbers, this will be a lot faster than keeping two parallel arrays and doing linear searches. For specific rule-of-thumb numbers, try it out or wait for the benchmarking numbers.

## Credits

Structure.js is being developed by [Ivan Budiselic](https://github.com/ibudiselic) with contrubitions from [Ivan Zuzak](http://ivanzuzak.info).

## License

Licensed under the [Apache 2.0 License](https://github.com/ibudiselic/structure.js/blob/master/LICENSE.md).
