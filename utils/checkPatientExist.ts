import * as config from '../config';
import * as configPrivate from '../config.private';
import * as moment from 'moment';
import {
    Matching
} from '@andes/match';
import {
    Client
} from 'elasticsearch';

/**
 * @deprecated
 */
export function exists(patient: any) {

    return new Promise((resolve, reject) => {
        const claveBlocking = patient.claveBlocking;
        const condicionMatch = {};
        const match = new Matching();
        let query;

        const connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        // Sugiere pacientes que tengan la misma clave de blocking
        condicionMatch['claveBlocking'] = {
            query: claveBlocking[0],
            minimum_should_match: 3,
            fuzziness: 2
        };
        query = {
            match: condicionMatch
        };

        // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
        const body = {
            size: 100,
            from: 0,
            query
        };
        connElastic.search({
            index: 'andes',
            body
        }).then((searchResult) => {
            const weights = config.mpi.weightsDefault;
            const porcentajeMatchMax = config.mpi.cotaMatchMax;
            ((searchResult.hits || {}).hits || []).filter((hit) => {
                const pacienteElastic = hit._source;
                const pacDto = {
                    documento: patient.documento ? patient.documento.toString() : '',
                    nombre: patient.nombre ? patient.nombre.toUpperCase() : '',
                    apellido: patient.apellido ? patient.apellido.toUpperCase() : '',
                    fechaNacimiento: patient.fechaNacimiento ? moment(new Date(patient.fechaNacimiento)).format('YYYY-MM-DD') : null,
                    sexo: patient.sexo ? patient.sexo : ''
                };
                const pacElasticDto = {
                    documento: pacienteElastic.documento ? pacienteElastic.documento.toString() : '',
                    nombre: pacienteElastic.nombre ? pacienteElastic.nombre.toUpperCase() : '',
                    apellido: pacienteElastic.apellido ? pacienteElastic.apellido.toUpperCase() : '',
                    fechaNacimiento: pacienteElastic.fechaNacimiento ? moment(pacienteElastic.fechaNacimiento).format('YYYY-MM-DD') : null,
                    sexo: pacienteElastic.sexo ? pacienteElastic.sexo : ''
                };
                const valorMatching = match.matchPersonas(pacDto, pacElasticDto, weights, 'Levenshtein');
                pacienteElastic['id'] = hit._id;

                if (valorMatching >= porcentajeMatchMax) {
                    // Existe con un % de matcheo alto
                    resolve(pacienteElastic['id']);
                } else {
                    // No existe el paciente y devolvemos '0' para indicar que hay que hacer insert
                    resolve(0);
                }
            });
        }).catch((error) => {
            reject(error);
        });

    });
}
