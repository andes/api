import { ambitoOrigenValido } from './ambito-origen';

describe('ambitoOrigenValido', () => {
    it.each(['ambulatorio', 'internacion', 'guardia'])('acepta %s', ambito => {
        expect(ambitoOrigenValido(ambito)).toBe(true);
    });

    it.each(['internado', 'desconocido', '', null, undefined, 1])('rechaza %p', ambito => {
        expect(ambitoOrigenValido(ambito)).toBe(false);
    });
});
