import {strict as assert} from 'node:assert';
import {search} from '../dist/search.js';

const item = name => ({name});

//> Most of the tests operate on this pre-set list of items to search
const ITEMS = [
    item('Linus Lee'),
    item('@thesephist'),
    item('@geohot'),
    item('linuslee'),
    item('linus is a person'),
    item('@dlwlrma'),
];

describe('basic search', () => {
    it('search empty array', () => {
        assert.deepEqual(search([], 'query', x => x.name), []);
    });

    it('search with empty query', () => {
        assert.deepEqual(search(ITEMS, '', x => x.name), ITEMS);
    });

    it('search with 1 letter returns correct result', () => {
        assert.deepEqual(search(ITEMS, 'l', x => x.name), [
            item('Linus Lee'),
            item('linuslee'),
            item('linus is a person'),
        ]);
    });

    it('search does not match from middle of words', () => {
        assert.deepEqual(search(ITEMS, 'w', x => x.name), []);
    });

    it('multi-word search returns correct result', () => {
        assert.deepEqual(search(ITEMS, 'linus lee', x => x.name), [
            item('Linus Lee'),
        ]);
    });

    it('searching words out of order returns correct result', () => {
        assert.deepEqual(search(ITEMS, 'lee linus', x => x.name), [
            item('Linus Lee'),
        ]);
    });

    it('search works even if the last query word is incomplete', () => {
        assert.deepEqual(search(ITEMS, 'linus le', x => x.name), [
            item('Linus Lee'),
        ]);
    });

    it('search query may contain newlines, tabs, and multiple consecutive spaces', () => {
        assert.deepEqual(search(ITEMS, '  linus\t is\nperson\t', x => x.name), [
            item('linus is a person'),
        ]);
    });

    it('correctly implements TF-IDF ranking', () => {
        //> In this example, "mango" has much higher IDF (is a higher-signal
        //  word) in the corpus than "apple", which appears in nearly every
        //  document. Therefore, documents that mention "mango" more times
        //  (relative to the length of the document) should rank higher.
        assert.deepEqual(
            search([
                // matches
                item('mango mango mango apple'),
                item('mango apple mango apple'),
                item('apple mango apple mango apple mango apple mango'),
                item('apple apple apple apple apple apple apple apple mango'),
                // rejects
                item('apple apple apple'),
                item('mango mango mango'),
                item('applemango'),
                item('mangoapple'),
                item('apple 1'),
                item('apple 2'),
                item('apple 3'),
                item('apple 4'),
                item('apple 5'),
                item('apple 6'),
                item('apple 7'),
                item('apple 8'),
                item('apple 9'),
            ], 'apple mango', x => x.name),
            [
                item('mango mango mango apple'),
                item('mango apple mango apple'),
                item('apple mango apple mango apple mango apple mango'),
                item('apple apple apple apple apple apple apple apple mango'),
            ]
        );
    });
});

describe('custom search-by predicates', () => {
    it('default predicate is provided as x => x', () => {
        assert.deepEqual(
            search([
                'university',
                'uni of california',
                'university of california',
            ], 'uni of cali'),
            [
                'uni of california',
            ]
        );
    });

    it('accepts and uses a custom predicate', () => {
        assert.deepEqual(search(ITEMS, 'sunil ee', x => x.name.split('').reverse().join('')), [
            item('Linus Lee'),
        ]);
    });
});

describe('search modes', () => {
    it('in mode: word, search does not match if any words are incomplete', () => {
        assert.deepEqual(search(ITEMS, 'linu lee', x => x.name, {mode: 'word'}), []);
    });

    it('in mode: prefix, every query word may be incomplete', () => {
        assert.deepEqual(search(ITEMS, 'linu le', x => x.name, {mode: 'prefix'}), [
            item('Linus Lee'),
        ]);
    });

    it('in mode: autocomplete, only the last query word may be incomplete', () => {
        assert.deepEqual(search(ITEMS, 'linus le', x => x.name, {mode: 'autocomplete'}), [
            item('Linus Lee'),
        ]);
        assert.deepEqual(search(ITEMS, 'linu le', x => x.name, {mode: 'autocomplete'}), []);
    });
});

describe('case sensitivity', () => {
    it('caseSensitive: true omits non-matching results', () => {
        assert.deepEqual(search(ITEMS, 'l', x => x.name, {caseSensitive: true}), [
            item('linuslee'),
            item('linus is a person'),
        ]);
    });

    it('caseSensitive: false includes case-insensitive results', () => {
        assert.deepEqual(search(ITEMS, 'l', x => x.name, {caseSensitive: false}), [
            item('Linus Lee'),
            item('linuslee'),
            item('linus is a person'),
        ]);
    });
});

