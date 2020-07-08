import { Connections } from './../../../connections';
import { SnomedCIE10Mapping } from './mapping';
import * as chai from 'chai';
import * as moment from 'moment';

declare const before;

function checkMap(paciente, contexto, concept, expect, done) {
    const map = new SnomedCIE10Mapping(paciente, contexto);
    map.transform(concept).then((cie10) => {
        chai.assert.strictEqual(cie10, expect);
        done();
    }).catch(err => {
        chai.assert.strictEqual(true, false);
        done();
    });
}

describe.skip('Snomed-CIE10 Mapping', function () {
    this.timeout(5000);

    before((done) => {
        Connections.initialize();
        done();
    });

    it('Always true rule', (done) => {
        checkMap({ sexo: 'masculino' }, ['37872007'], '11857005', 'J34.0', done);
    });

    it('otherwise true', (done) => {
        checkMap(null, [], '11939005', 'M19.90', done);
    });

    it('with snomed term context', (done) => {
        checkMap(null, ['26071001'], '11939005', 'M00.9', done);
    });

    it('sex different - Mujer', (done) => {
        checkMap({ sexo: 'femenino' }, ['26071001'], '22347002', 'E28.9', done);
    });

    it('sex different - Hombre', (done) => {
        checkMap({ sexo: 'masculino' }, ['26071001'], '22347002', 'E29.9', done);
    });

    it('Sex rule with conecpt', (done) => {
        checkMap({ sexo: 'femenino' }, ['66899007'], '23654009', 'S31.502?', done);
    });

    it('Age context date between 1 and 28 years', (done) => {
        const paciente = {
            fechaNacimiento: moment().subtract(2, 'y').format(),
            sexo: 'femenino'
        };
        checkMap(paciente, ['81077008'], '11939005', 'M08.00', done);
    });

    it('Age context date between 1 and 28 years otherwise', (done) => {
        const paciente = {
            fechaNacimiento: moment().subtract(2, 'd').format(),
            sexo: 'femenino'
        };
        checkMap(paciente, ['81077008'], '11939005', 'M06.9', done);
    });

    it('days unit success', (done) => {
        const paciente = {
            fechaNacimiento: moment().subtract(2, 'd').format(),
            sexo: 'femenino'
        };
        checkMap(paciente, ['81077008'], '12063002', 'P54.2', done);
    });

    it('days unit else rule success', (done) => {
        const paciente = {
            fechaNacimiento: moment().subtract(50, 'd').format()
        };
        checkMap(paciente, [], '12063002', 'K62.5', done);
    });


});
