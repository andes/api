import * as config from '../config';
import * as configPrivate from '../config.private';
import * as moment from 'moment';
import {
    Matching
} from '@andes/match';
import {
    Client
} from 'elasticsearch';

export function exists(patient: any) {

    return new Promise((resolve, reject) => {
        let claveBlocking = patient.claveBlocking;
        let condicionMatch = {};
        let match = new Matching();
        let query;

        let connElastic = new Client({
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
        let body = {
            size: 100,
            from: 0,
            query: query
        };

        connElastic.search({
                index: 'andes',
                body: body
            })
            .then((searchResult) => {
                let weights = config.mpi.weightsDefault;
                let porcentajeMatchMax = config.mpi.cotaMatchMax;
                ((searchResult.hits || {}).hits || [])
                .filter(function (hit) {
                    let pacienteElastic = hit._source;
                    let pacDto = {
                        documento: patient.documento ? patient.documento.toString() : '',
                        nombre: patient.nombre ? patient.nombre : '',
                        apellido: patient.apellido ? patient.apellido : '',
                        fechaNacimiento: patient.fechaNacimiento ? moment(new Date(patient.fechaNacimiento)).format('YYYY-MM-DD') : '',
                        sexo: patient.sexo ? patient.sexo : ''
                    };
                    let pacElasticDto = {
                        documento: pacienteElastic.documento ? pacienteElastic.documento.toString() : '',
                        nombre: pacienteElastic.nombre ? pacienteElastic.nombre : '',
                        apellido: pacienteElastic.apellido ? pacienteElastic.apellido : '',
                        fechaNacimiento: pacienteElastic.fechaNacimiento ? moment(pacienteElastic.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: pacienteElastic.sexo ? pacienteElastic.sexo : ''
                    };
                    let valorMatching = match.matchPersonas(pacElasticDto, pacDto, weights, 'Levenshtein');
                    pacienteElastic['id'] = hit._id;

                    if (valorMatching >= porcentajeMatchMax) {
                        // Existe con un % de matcheo alto
                        resolve(pacienteElastic['id']);
                    } else {
                        // No existe el paciente y devolvemos '0' para indicar que hay que hacer insert
                        resolve(0);
                    }
                });
            })
            .catch((error) => {
                reject(error);
            });

    });
}
