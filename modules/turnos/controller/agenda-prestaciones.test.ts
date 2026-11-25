import { populateIncluyePrestaciones } from './agenda-prestaciones';

describe('populateIncluyePrestaciones', () => {
    it.each([
        ['prestaciones', true],
        ['prestaciones,notas', true],
        ['notas prestaciones', true],
        [['prestaciones'], true],
        ['', false],
        [undefined, false],
        [null, false],
        ['notas', false],
    ])('%p -> %p', (input, expected) => {
        expect(populateIncluyePrestaciones(input as any)).toBe(expected);
    });
});
