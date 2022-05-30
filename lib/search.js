//> ## Basic principles

//> TODO: Explain stuff...

//> ## Implementation

//> To turn every potential query into a regular expression, we need to be able to escape key characters.
function escapeForRegExp(text) {
    return text.replace(/[.*+?^${}[\]()|\\]/g, '\\$1');
}

//> The main search function takes:
//  - `query`, the search query text
//  - `items`, the list of items to search
//  - `by`, which is a predicate (string, number, or function) that takes an item from the items list and returns the string that should be matched with the query
//
//  Options include
//  - `caseSensitive`, which is self-explanatory
//  - `mode`: which is 'word' or 'prefix' (default)
export function search(query, items, by = x => x, options) {
    options = {
        caseSensitive: false,
        mode: 'prefix',
        ...options,
    }

    function countMatches(s, regexp) {
        let i = 0;
        const exec = regexp.exec.bind(regexp);
        while (exec(s) !== null) {
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

    const suggestions = words.reduce((suggestions, word, i) => {
        const isLastWord = i + 1 === words.length;
        const regexp = new RegExp(
            '(^|\\W)' + escapeForRegExp(word) + (isLastWord ? '' : '($|\\W)'),
            'img'
        );
        return suggestions.filter(sugg => countMatches(by(sugg), regexp) > 0);
    }, items);

    // TODO: sort by TF-IDF
    return sortBy(suggestions, by);
}

