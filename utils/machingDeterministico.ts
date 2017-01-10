import { IPerson } from './IPerson';
import { IWeight } from './IWeight';
import { libString } from './libString';

export class machingDeterministico {

    /**
     * @description stringMatching - Devuelve la cantidad de coincidencias sobre la mayor longitud
     * @param {string} stringA - unString
     * @param {string} stringB - unString
     * @author Hugo Fernández hfernandez@neuquen.gov.ar
     */
    private stringMatching(stringA, stringB) {
        var stringAMin = stringA.toLowerCase();
        var stringBMin = stringB.toLowerCase();

        var maxLen = libString.maxLargo(stringAMin, stringBMin);
        var minLen = libString.minLargo(stringAMin, stringBMin);
        var coincidencias = 0;


        for (var i = 0; i < minLen; i++) {
            if (stringAMin.charAt(i) == stringBMin.charAt(i))
                coincidencias++
        }

        return coincidencias / maxLen;
    }

    /**
     * @description sexMatching - Devuelve 1 si los datos son idénticos
     * @param {string} sexA - sexo del pacienteA
     * @param {string} sexB - sexo del pacienteB
     * @author Hugo Fernández hfernandez@neuquen.gov.ar
     */
    private sexMatching(sexA, sexB) {
        if (sexA == sexB)
            return 1
        else
            return 0
    }

    /**
     * @description identityMatching - Devuelve 1 si los identificadores son idénticos
     * @param {int} idA - Documento del pacienteA
     * @param {int} idB - Documento del pacienteB
     * @author Hugo Fernández hfernandez@neuquen.gov.ar
     */
    private identityMatching(idA, idB) {
        if (idA == idB)
            return 1
        else
            return 0

    }


    /**
     * @description levenshtein - Devuelve un porcentaje de coincidencia entre dos string
     * @param {string} stringA - Primer string a comparar
     * @param {string} stringB - Segundo string a comparar
     * @author Hugo Fernández hfernandez@neuquen.gov.ar
     */
    private levenshtein(stringA: string, stringB: string): number {
        //var s1 = libString.preprocessInput(stringA.toLowerCase());
        //var s2 = libString.preprocessInput(stringB.toLowerCase());
        var s1 = stringA;
        var s2 = stringB;

        var maxLen = libString.maxLargo(s1, s2);

        var l1 = s1.length;
        var l2 = s2.length;
        var d = [];
        var c = 0;
        var a = 0;

        if (l1 == 0)
            return 0;

        if (l2 == 0)
            return 0;

        a = l1 + 1;

        for (var i = 0; i <= l1; d[i] = i++);
        for (var j = 0; j <= l2; d[j * a] = j++);

        for (var i = 1; i <= l1; i++) {
            for (var j = 1; j <= l2; j++) {
                if (s1[i - 1] == s2[j - 1])
                    c = 0;
                else
                    c = 1;
                var r = d[j * a + i - 1] + 1;
                var s = d[(j - 1) * a + i] + 1;
                var t = d[(j - 1) * a + i - 1] + c;

                d[j * a + i] = Math.min(Math.min(r, s), t);
            }
        }

        return 1 - ((d[l2 * a + l1]) / maxLen)
    }


    /**
     * @description maching - Devuelve un porcentaje macheo entre dos personas
     * @param {IPerson} identidadA - Objeto json de persona A
     * @param {IPerson} identidadB - Objeto json de persona B
     * @param {IWeight} weights - Json de pesos de los campos a comparar
     * @author Hugo Fernández hfernandez@neuquen.gov.ar
     */
    public maching(identidadA: IPerson, identidadB: IPerson, weights: IWeight): number {
        var completeNameA = identidadA.firstname + identidadA.lastname;
        var completeNameB = identidadB.firstname + identidadB.lastname;
        var v1 = weights.name * this.levenshtein(libString.preprocessInput(completeNameA.toLocaleLowerCase()), libString.preprocessInput(completeNameB.toLowerCase()));
        var v2 = weights.gender * this.sexMatching(identidadA.gender, identidadB.gender);
        var v3 = weights.birthDate * this.stringMatching(identidadA.birthDate, identidadB.birthDate);
        //var v3 = weights.birthDate * this.levenshtein(identidadA.birthDate, identidadB.birthDate);
        //var v4 = weights.identity * this.identityMatching(identidadA.identity, identidadB.identity);
        //var v4 = this.levenshtein(identidadA.identity, identidadB.identity);
        var v4 = weights.identity * this.levenshtein(identidadA.identity, identidadB.identity);
        //console.log(v1);
        //console.log(v2);
        //console.log(v3);
       // console.log('levenshtein de documento: '+v4);
        var value = Math.round((v1 + v2 + v3 + v4) * 100) / 100;
        
        return value;
    }


}//fin class
