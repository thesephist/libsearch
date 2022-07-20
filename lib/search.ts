//> ## Basic principles

//> TODO: Explain stuff...

//> ## Implementation

//> To turn every potential query into a regular expression, we need to be able
//  to escape key characters.
function escapeForRegExp(text: string): string {
    return text.replace(/[.*+?^${}[\]()|\\]/g, '\\$1');
}

//> Utility function for sorting an array by some predicate, rather than a
//  comparator function.
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

//> The main search function takes:
//  - `items`, the list of items to search
//  - `query`, the search query text
//  - `by`, which is a predicate (string, number, or function) that takes an item from the items list and returns the string that should be matched with the query
//
//  Options include
//  - `caseSensitive`, which is self-explanatory
//  - `mode`: which is 'word' or 'prefix' ('prefix' by default)
export function search<T>(items: T[], query: string, by: (_it: T) => any = x => x, {
    caseSensitive = false,
    mode = 'prefix',
}: {
    caseSensitive?: boolean;
    mode?: 'word' | 'prefix';
} = {}) {
    function countMatches(s: string, regexp: RegExp): number {
        let i = 0;
        while (regexp.exec(s) !== null) {
            i ++;
        }
        return i;
    }

    const words = query
        .trim()
        .split(' ')
        .filter(s => s !== '');

    if (words.length === 0) {
        return items;
    }

    const tfidf = new Map<T, number>();
    const suggestions = words.reduce((suggestions, word, i) => {
        const isLastWord = i + 1 === words.length;
        const regexp = new RegExp(
            '(^|\\W)' + escapeForRegExp(word) + (isLastWord || mode === 'prefix' ? '' : '($|\\W)'),
            // the "u" flag for Unicode used to be used here, but was removed
            // because it was (1) across-the-board too slow, and removing it
            // made a statistically significant speed improvement, and (2)
            // caused at least Chrome to have strange performance cliffs in
            // unpredictable ways where certain regexp operations would take
            // 10s of ms.
            caseSensitive ? 'mg' : 'img'
        );
        return suggestions.filter(sugg => {
            const text = by(sugg);
            const count = countMatches(text, regexp);
            if (count === 0) {
                return false;
            }
            //> TF-IDF weighting per-term
            tfidf.set(
                sugg,
                (tfidf.get(sugg) || 0)
                    + (count / text.length * Math.log(items.length / suggestions.length))
            );
            return true;
        })
    }, items);

    return sortBy(suggestions, sugg => tfidf.get(sugg));
}

