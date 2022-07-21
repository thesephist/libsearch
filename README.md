# libsearch 🔎

[![npm libsearch](https://img.shields.io/npm/v/libsearch.svg)](http://npm.im/libsearch)
[![TypeScript types](https://img.shields.io/npm/types/libsearch.svg)](https://github.com/thesephist/libsearch/tree/main/lib/search.ts)
[![Build Status](https://app.travis-ci.com/thesephist/libsearch.svg?branch=main)](https://app.travis-ci.com/thesephist/libsearch)

Simple, index-free text search for JavaScript, used across my personal projects like [YC Vibe Check](https://ycvibecheck.com/), [linus.zone/entr](https://linus.zone/entr), and my personal productivity software. Read the [annotated source](https://thesephist.github.io/libsearch/lib/search.ts.html) to understand how it works under the hood.

## The API

Let's begin with some quick examples:

```js
import { search } from 'libsearch'; // on Node.js
const { search } = window.libsearch; // in the browser

const articles = [
    { title: 'Weather in Berkeley, California' },
    { title: 'University report: UC Berkeley' },
    { title: 'Berkeley students rise in solidarity...' },
    { title: 'Californian wildlife returning home' },
];

// basic usage
search(articles, 'berkeley cali', a => a.title);
// => [{ title: 'Weather in Berkeley, California' }]
search(articles, 'california', a => a.title);
// => [
//   { title: 'Weather in Berkeley, California' },
//   { title: 'Californian wildlife returning home' },
// ]

// mode: 'word' only returns whole-word matches
search(articles, 'california', a => a.title, { mode: 'word' });
// => [{ title: 'Weather in Berkeley, California' }]

// case sensitivity
search(articles, 'W', a => a.title, { caseSensitive: true });
// => [{ title: 'Weather in Berkeley, California' }]

// empty query returns the full list, unmodified
search(articles, '', a => a.title);
// => [{...}, {...}, {...}, {...}]
```

More formally, libsearch exposes a single API, the `search` function. This function takes two required arguments and two optional arguments:

```ts
function search<T>(
    items: T[],
    query: string,
    by?: (it: T) => string,
    options?: {
        caseSensitive: boolean,
        mode: 'word' | 'prefix' | 'autocomplete',
    },
): T[]
```

- `items` is a list of items to search with a text query. Typically `items` will be an array of strings or an array of objects with some string property.
- `query` is a string query with which to search the list of items.
- `by` (_optional_) is a predicate function that takes an item from `items` and returns a string value by which to search for that item. For example, if `items` is a list of objects like `{ name: 'Linus' }`, `by` will need to be a function `x => x.name`. This has the value `x => String(x)` by default, which works for an `items` of type `string[]`.
- `options` (_optional_) is a dictionary of options:
    - `caseSensitive` makes a search case-sensitive. It's `false` by default.
    - `mode` controls the way in which incomplete query words are matched:
        - `mode: 'word'` requires every query word match only full, exact words rather than parts of words. For example, the query "California" will match "University of **California**" but not "**California**n University".
        - `mode: 'prefix'` means that every query word may be an incomplete "prefix" of the matched word. "Uni Cali" will match both "**Uni**versity of **Cali**fornia" and "**Cali**fornian **Uni**versity" Even in this mode, every query word must match somewhere — "**Cali**fornia" is not a match, because it doesn't match the query word "Uni".
        - `mode: 'autocomplete'` is a hybrid of the other two modes that's useful when used in autocomplete-style searches, where a user is continuously typing in a query as search results are being returned. This mode is identical to `mode: 'word'`, except that the last query word may be incomplete like in `mode: 'prefix'`. It means "University of Cali" will match "**University of Cali**fornia", which is useful because the user may find their match before having typed in their full query.

You can find more examples of how these options combine together in the [unit tests](test/search.js).

## Installation and usage

### On the web, with `<script>`

Drop this into your HTML:

```html
<script src="https://unpkg.com/libsearch/dist/browser.js"></script>
```

This will expose the `search` function as `window.libsearch.search`.

### Via NPM

```sh
npm install libsearch
# or
yarn add libsearch
```

And use in your code:

```js
import { search } from 'libsearch';

// search(...);
```

### Using TypeScript types

libsearch ships with TypeScript type definitions generated from the source file. Using libsearch from NPM should get them picked up by the TypeScript compiler.

## How it works

libsearch lets you perform basic full-text search across a list of JavaScript objects quickly, without requiring a pre-built search index, while offering reasonably good [TF-IDF](https://en.wikipedia.org/wiki/Tf%E2%80%93idf) ranking of results. It doesn't deliver the wide array of features that come with libraries like [FlexSearch](https://github.com/nextapps-de/flexsearch) and [lunr.js](https://lunrjs.com/), but is a big step above `text.indexOf(query) > -1`, and is fast enough to be usable for searching thousands of documents on every keystroke in my experience.

There are two key ideas in how libsearch delivers this:

### 1. Transforming queries into regular expressions

Modern JavaScript engines ship with [highly optimized regular expression engines](https://v8.dev/blog/non-backtracking-regexp), and libsearch takes advantage of this for fast, index-free text search by transforming query strings into regular expression filters at search time.

Most full-text search libraries work by first requiring the developer to build up an "index" data structure mapping search terms to documents in which they appear. This is usually a good tradeoff, because it moves some of the computational work of "searching" to be done ahead of time, so search itself can remain fast and accurate. It also allows for fancy transformations and data cleanup like [lemmatization](https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html) on the indexed data without destroying search speed. But when building prototypes and simple web apps, I often didn't want to incur the complexity of having a separate "indexing" step to get a "good enough" search solution. An index needs to be stored somewhere and maintained constantly as the underlying dataset changes and grows.

The main task of a search index is mapping "tokens" or keywords that appear in the dataset to the documents in which they appear, so that the question "which documents contain the word X?" is fast (`O(1)`) to answer at search time. Without an index, this turns into an `O(n)` question, as every document needs to be scanned for the keyword. _But often, on modern hardware, for small-enough datasets (of a few MBs) typical in a client-side web app, the `n` is pretty small, small enough that `O(n)` on every keystroke isn't noticeable._

libsearch transforms a query like "Uni of California" into a list of regular expression filters, `(^|\W)Uni($|\W)`, `(^|\W)of($|\W)`, `(^|\W)California`. It then "searches" without needing an index by filtering the corpus through each of those regular expressions.

### 2. "Good enough" TF-IDF ranking based on RegExp matches and document length

The conventional TF-IDF metric is computed for each word as:

```js
(# matches) / (# words in the doc) * log(# total docs / # docs that matched)
```

Getting the number of words in a doc requires tokenizing the document, or at least splitting the document by whitespaces, which is computationally expensive. So libsearch approximates this by using the length of the document (number of characters) instead.

Using the regular expression queries described above, libsearch's TF-IDF formula is:

```js
(# RegExp matches) / (doc.length) * log(# docs / # docs that matched RegExp)
```

which is computed for each word as the search is performed, and then aggregated at the end for sorting.

## Development

libsearch's source code is [written in TypeScript](lib/search.ts). To allow the library to be used across TypeScript, vanilla Node.js and the web, we compile two builds:

- The **ES module build**, which is just `search.ts` type-checked and types removed. This is the code imported when `libsearch` is imported in Node.js
- The **browser build**, which exports the main `search` function to the `window.libsearch` global

The ES module build is produced with `tsc`, the TypeScript compiler, and the minified browser build is further produced with Webpack.

NPM/Yarn commands:

- `lint` and `fmt`, which lint and automatically format source code in the repository
- `test` runs unit tests on the latest build of the library; you should run `build:tsc` before running `test`
- Various `build:*` commands orchestrate producing the different types of library builds:
    - `build:tsc` builds the ES module build
    - `build:w` runs `build:tsc` on every file write
    - `build:cjs` builds the browser build _from the ES module build_
    - `build:all` builds both builds, in order
- `clean` removes all generated/build files in `dist/`
- `docs` builds the [Litterate](https://github.com/thesephist/litterate)-based documentation, which lives at [thesephist.github.io/libsearch](https://thesephist.github.io/libsearch/lib/search.ts.html).

Before pushing to main or publishing, I usually run

```sh
yarn fmt && yarn build:all && yarn test && yarn docs
```

to make sure I haven't forgotten anything.
