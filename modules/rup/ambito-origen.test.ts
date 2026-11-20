import { procedenciaValida } from './ambito-origen';

describe('procedenciaValida', () => {
    it.each(['ambulatorio', 'internacion', 'guardia'])('acepta %s', procedencia => {
        expect(procedenciaValida(procedencia)).toBe(true);
    });

    it.each(['internado', 'desconocido', '', null, undefined, 1])('rechaza %p', procedencia => {
        expect(procedenciaValida(procedencia)).toBe(false);
    });
});
