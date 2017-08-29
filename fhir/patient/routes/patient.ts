import * as express from 'express';
import * as mongoose from 'mongoose';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as utils from '../../../utils/utils';
import {
    Matching
} from '@andes/match';
import {
    Client
} from 'elasticsearch';
import {
    Auth
} from './../../../auth/auth.class';

let router = express.Router();

// Schemas
import {
    pacienteMpi
} from '../../../core/mpi/schemas/paciente';


router.get('/match', function (req, res, next) {
    // Verificación de permisos
    // if (!Auth.check(req, 'fhir:pacient:match')) {
    //     return next(403);
    // }
    let connElastic = new Client({
        host: configPrivate.hosts.elastic_main,
    });

    let consulta = req.query;

    if (req.query.identifier) {
        consulta['documento'] = req.query.identifier;
    }
    if (req.query.family) {
        consulta['apellido'] = {
            '$regex': utils.makePattern(req.query.family)
        };
    }
    if (req.query.given) {
        consulta['nombre'] = {
            '$regex': utils.makePattern(req.query.given)
        };
    }

    let esQuery = {
        multi_match: {
            query: consulta,
            type: 'cross_fields',
            fields: ['documento^5', 'nombre', 'apellido^3'],
        }
    };

    // Configuramos la cantidad de resultados que quiero que se devuelva y la query correspondiente
    let body = {
        size: 100,
        from: 0,
        query: esQuery
    };

    connElastic.search({
                index: 'andes',
                body: body
            })
            .then((searchResult) => {
                let results: Array < any > = ((searchResult.hits || {}).hits || [])
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
});

export = router;
