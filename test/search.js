//> Because of Chai's assertion syntax, this ESLint rule doesn't really make
//  sense.
/* eslint-disable no-unused-expressions */

import {strict as assert} from 'node:assert';
import {search} from '../dist/search.js';

const ITEMS = [{
    name: 'Linus Lee',
}, {
    name: '@thesephist',
}, {
    name: '@geohot',
}, {
    name: 'linuslee',
}, {
    name: 'linus is a person',
}]

describe('basic search', () => {
    it('search with 1 letter returns correct result', () => {
        assert.deepEqual(search(ITEMS, 'l', x => x.name), [{
            name: 'Linus Lee',
        }, {
            name: 'linuslee',
        }, {
            name: 'linus is a person',
        }]);
    });
});

