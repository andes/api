import * as express from 'express';
import { snomedModel } from '../schemas/snomed';
//import { util } from '../../../utils/utils';
let util = require('../../../utils/utils');

let router = express.Router();

// is a: 116680003
// BUSCAR COMO: 'relationships.type.conceptId': '116680003', 
const esUn = '116680003';

// Contexto temporal 
// contexto temporal: 408731000 , utilizado para indicar que es 'en este momento'
// BUSCAR COMO: 'relationships.type.conceptId': '408731000', 
const contextoTemporal = '408731000';
//const contextoTemporal = {'relationships.type.conceptId': '408731000'};

// Antecedente
// actual o pasado (calificador) 410511007
// BUSCAR COMO: 'relationships.target.conceptId': '410511007'
const antecedente = '410511007';
//const antecedente = {'relationships.target.conceptId': '410511007'};

// Antecendente familiar
// actual o pasado (calificador) mas contexto de relación con el sujeto (atributo) 408732007
// BUSCAR COMO: 'relationships.type.conceptId': '408732007' 
// ¿ Buscar en conjunto con el antecendete ?
const antecedenteFamiliar = '408732007';
//const antecedenteFamiliar = {'relationships.type.conceptId': '408731000'};

router.get('/', function (req, res, next) {
    /*
    db.getCollection('v20160430').aggregate([
        {'$project': {fsn: 1, conceptId: 1, descriptions: 1} }, 
        { '$match': {'descriptions.lang': 'es'} },
        { '$unwind': '$descriptions' },
        { '$match': { 'descriptions.term': { "$regex": /hiper/i } } },
        { '$unwind': '$descriptions.term' },
    ])
    */

    /*
    // El browser de SNOMED utiliza estos parametros, investigarlos.
    semanticFilter: 'none', 
    limit: 10,
    searchMode: 'partialMatching',
    lang: 'english',
    statusFilter: 'activeOnly',
    skipTo: 0,
    returnLimit: 10,
    langFilter: 'spanish',
    normalize: true
    */

    /*
    console.log(req.query.tipo);
    let query;
    
    // Nociones, al parecer si no filtramos por ningun tipo de relacion
    // entonces nos trae trastornos y hallazgos
    const conditions = {
        'descriptions.lang': 'es',

        //'relationships.type.conceptId': esUn,
        //'relationships.type.conceptId': contextoTemporal,  // me indica que es una situacion (situcion) en los resultados . Investigar que significa


        // agregamos el string de busqueda a la condicion  para los casos en los que no selecciono
        // ningun tipo de filtro de antecedentes , asi filtro por regex los que tengan las palabras
        // hallazgo o trastorno
        ...req.query.search && !req.query.tipo && { $and : [
            { 'descriptions.term': { "$regex": util.makePattern(req.query.search)} },            
            {
                $or: [
                    {'descriptions.term': { "$regex": '(hallazgo)' } },
                    {'descriptions.term': { "$regex": '(trastorno)' } }
                ]
            }
        ]},

        // entonces hago una busqueda simple de texto y agrego los casos de los filtros
        ...req.query.search && req.query.tipo && {'descriptions.term': { "$regex": util.makePattern(req.query.search)} },
        ...(req.query.tipo == 'antecedentes') && {'relationships.target.conceptId': antecedente},
        ...(req.query.tipo == 'antecedentesFamiliares') && {'relationships.type.conceptId': antecedenteFamiliar},
    };
    
    const projection = {
        conceptId: 1, 
        term: 1, 
        active: 1, 
        conceptActive: 1, 
        'descriptions.term': 1,
        'descriptions.lang': 1,
        fsn: 1, 
        module: 1, 
        definitionStatus: 1
    };
    
    query = snomedModel.find(conditions, projection);

    query.limit(50);

    query.exec(function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });
    */

    snomedModel.aggregate([
        { '$project': {fsn: 1, conceptId: 1, descriptions: 1} }, 
        { '$match': {'descriptions.lang': 'es'} },
        { '$unwind': '$descriptions' },
        { '$match': { 
            //'descriptions.term': { 
            //    "$regex": util.makePattern(req.query.search) } 
            //} 
            ...req.query.search && !req.query.tipo && { $and : [
                { 'descriptions.term': { "$regex": util.makePattern(req.query.search)} },            
                {
                    $or: [
                        {'descriptions.term': { "$regex": '(hallazgo)' } },
                        {'descriptions.term': { "$regex": '(trastorno)' } }
                    ]
                }
            ]}
        },
        //{ '$unwind': '$descriptions.term' },
    ])
    .limit(10)
    .exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });

});

export = router;


