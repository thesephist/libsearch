//> **libsearch** is the core text search algorithm that I've polished and
//  reused over the years across [many of my personal
//  projects](https://thesephist.com/projects) for fast and simple full-text
//  search, packaged into a small single-purpose JavaScript library.
//
//  For how libsearch works, how to import and use in your own project, and
//  canonical documentation, check out the [GitHub repository
//  page](https://github.com/thesephist/libsearch).

//> To turn every potential query into a regular expression, we need to be able
//  to escape characters that are significant in RegExp.
function escapeForRegExp(text: string): string {
    return text.replace(/[.*+?^${}[\]()|\\]/g, '\\$1');
}

//> Utility function for sorting an array by some predicate, rather than a
//  comparator function. This implementation assumes `by(it)` is very cheap.
function sortBy<T>(items: T[], by: (_it: T) => any): T[] {
    return items.sort((a, b) => {
        const aby = by(a);
        const bby = by(b);
        if (aby < bby) {
            return 1;
        }
        if (bby < aby) {
            return -1;
        }
        return 0;
    });
}

//> The search function takes:
//  - `items`, the list of items to search
//  - `query`, the search query text
//  - `by`, which is a predicate function that takes an item from the items
//    list and returns the string that should be matched with the query
//  - `options`, a dictionary of options:
//
//  Options include
//  - `caseSensitive`, which is self-explanatory
//  - `mode`: which is 'word', 'prefix', or 'autocomplete' ('autocomplete' by
//    default), determining the way in which partial matches are processed
export function search<T>(items: T[], query: string, by: (_it: T) => string = x => String(x), {
    caseSensitive = false,
    mode = 'autocomplete',
}: {
    caseSensitive?: boolean;
    mode?: 'word' | 'prefix' | 'autocomplete';
} = {}) {
    //> `countMatches` counts the number of times `regexp` occurs in the string
    //  `s`. We need this information for ranking, where documents that mention
    //  the keyword more times (relative to the total word count of the
    //  document) are ranked higher.
    function countMatches(s: string, regexp: RegExp): number {
        let i = 0;
        while (regexp.exec(s) !== null) {
            i ++;
        }
        return i;
    }

    //> We chunk up the query string into a list of "words", each of which will
    //  become a regular expression filter.
    const words = query
        .trim()
        .split(/\s+/)
        .filter(s => s !== '');

    //> Short-circuit if the search query is empty -- return the original list.
    //  This is a sensible default because in most apps this corresponds to the
    //  "home view" of the list, where a search has not been performed.
    if (words.length === 0) {
        return items;
    }

    //> For every word in the search query, we're going to keep track of every
    //  document's TF-IDF value in this map, and aggregate them together by the
    //  end for sorting.
    const tfidf = new Map<T, number>();

    //> Iterate through every word in the query and progressively filter down
    //  `items` to just the documents that match every query word.
    const results = words.reduce((results, word, i) => {
        const isLastWord = i + 1 === words.length;
        const regexp = new RegExp(
            '(^|\\W)'
                + escapeForRegExp(word)
                + ((mode === 'autocomplete' && isLastWord) || mode === 'prefix' ? '' : '($|\\W)'),
            //> The 'u' flag for Unicode used to be used here, but was removed
            //  because it was (1) across-the-board too slow, and removing it
            //  made a statistically significant speed improvement, and (2)
            //  caused at least Chrome to have strange performance cliffs in
            //  unpredictable ways where certain RegExp operations would take
            //  10s of ms.
            caseSensitive ? 'mg' : 'img'
        );
        return results.filter(result => {
            const text = by(result);
            const count = countMatches(text, regexp);
            if (count === 0) {
                return false;
            }
            //> Compute the TF-IDF value for this `word`, and add it to this
            //  result's TF-IDF value so far.
            tfidf.set(
                result,
                (tfidf.get(result) || 0)
                    + (count / text.length * Math.log(items.length / results.length))
            );
            return true;
        })
    }, items);

    //> Sort the results list by our ranking metric, TF-IDF.
    return sortBy(results, result => tfidf.get(result));
}

