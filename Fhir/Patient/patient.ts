import * as express from 'express';
import * as mongoose from 'mongoose';
import * as config from '../../config';
import * as configPrivate from '../../config.private';
import * as moment from 'moment';
import { Matching } from '@andes/match';
import { Client } from 'elasticsearch';
import { Auth } from './../../auth/auth.class';
let router = express.Router();

// Schemas
import { pacienteMpi } from '../../core/mpi/schemas/paciente';




router.get('/$match', function (req, res, next) {
    // if (!Auth.check(req, 'fhir:pacient:match')) {
    //     return next(403);
    // }

    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });

    let query;
    switch (req.query.type) {
        case 'simplequery':
            {
                query = {
                    simple_query_string: {
                        query: '\"' + req.query.documento + '\" + \"' + req.query.apellido + '\" + \"' + req.query.nombre + '\" +' + req.query.sexo,
                        fields: ['documento', 'apellido', 'nombre', 'sexo'],
                        default_operator: 'and'
                    }
                };
            }
            break;
        case 'multimatch':
            {
                query = {
                    multi_match: {
                        query: req.query.cadenaInput,
                        type: 'cross_fields',
                        fields: ['documento^5', 'nombre', 'apellido^3'],
                    }
                };
            }
            break;
        case 'suggest':
            {
                // let condicion = {};

                // Sugiere pacientes que tengan la misma clave de blocking
                let campo = req.query.claveBlocking;
                let condicionMatch = {};
                condicionMatch[campo] = {
                    query: req.query.documento,
                    minimum_should_match: 3,
                    fuzziness: 2
                };
                query = {
                    match: condicionMatch
                };
            }
            break;
    }
    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    let body = {
        size: 100,
        from: 0,
        query: query
    };

    // Logger de la consulta a ejecutar
    // Logger.log(req, 'mpi', 'query', {
    //     elasticSearch: query
    // });

    if (req.query.type === 'suggest') {

        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {

                // Asigno los valores para el suggest
                let weights = config.mpi.weightsDefault;

                if (req.query.escaneado) {
                    weights = config.mpi.weightsScan;
                }

                let porcentajeMatchMax = config.mpi.cotaMatchMax;
                let porcentajeMatchMin = config.mpi.cotaMatchMin;
                let listaPacientesMax = [];
                let listaPacientesMin = [];
                // let devolverPorcentaje = req.query.percentage;

                ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .filter(function (hit) {
                        let paciente2 = hit._source;
                        let pacDto = {
                            documento: req.query.documento ? req.query.documento.toString() : '',
                            nombre: req.query.nombre ? req.query.nombre : '',
                            apellido: req.query.apellido ? req.query.apellido : '',
                            fechaNacimiento: req.query.fechaNacimiento ? moment(new Date(req.query.fechaNacimiento)).format('YYYY-MM-DD') : '',
                            sexo: req.query.sexo ? req.query.sexo : ''
                        };
                        let pacElastic = {
                            documento: paciente2.documento ? paciente2.documento.toString() : '',
                            nombre: paciente2.nombre ? paciente2.nombre : '',
                            apellido: paciente2.apellido ? paciente2.apellido : '',
                            fechaNacimiento: paciente2.fechaNacimiento ? moment(paciente2.fechaNacimiento).format('YYYY-MM-DD') : '',
                            sexo: paciente2.sexo ? paciente2.sexo : ''
                        };
                        let match = new Matching();
                        let valorMatching = match.matchPersonas(pacElastic, pacDto, weights, 'Levenshtein');
                        paciente2['id'] = hit._id;

                        if (valorMatching >= porcentajeMatchMax) {
                            listaPacientesMax.push({
                                id: hit._id,
                                paciente: paciente2,
                                match: valorMatching
                            });
                        } else {
                            if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                                listaPacientesMin.push({
                                    id: hit._id,
                                    paciente: paciente2,
                                    match: valorMatching
                                });
                            }
                        }
                    });

                // if (devolverPorcentaje) {
                let sortMatching = function (a, b) {
                    return b.match - a.match;
                };

                // cambiamos la condición para lograr que nos devuelva más de una sugerencia
                // ya que la 1ra sugerencia es el mismo paciente.
                // if (listaPacientesMax.length > 0) {
                if (listaPacientesMax.length > 0) {
                    listaPacientesMax.sort(sortMatching);
                    res.send(listaPacientesMax);
                } else {
                    listaPacientesMin.sort(sortMatching);
                    res.send(listaPacientesMin);
                }
                // } else {
                //     results = results.map((hit) => {
                //         let elem = hit._source;
                //         elem['id'] = hit._id;
                //         return elem;
                //     });
                //     res.send(results);
                // }
            })
            .catch((error) => {
                next(error);
            });
    } else { // Es para los casos de multimatch y singlequery
        connElastic.search({
            index: 'andes',
            body: body
        })
            .then((searchResult) => {
                let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                    .map((hit) => {
                        let elem = hit._source;
                        elem['id'] = hit._id;
                        return elem;
                    });
                res.send(results);
            })
            .catch((error) => {
                next(error);
            });
    }
});