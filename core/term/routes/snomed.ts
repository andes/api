import * as express from 'express';
import { model } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as cie10 from '../schemas/cie10';
import { SnomedCIE10Mapping } from './../controller/mapping';

let router = express.Router();

/**
 * @swagger
 * /snomed:
 *   get:
 *     tags:
 *       - Terminología
 *     description: Una info
 *     summary: Búsqueda de conceptos de SNOMED
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: search
 *         in: query
 *         description: Términos o ID de concepto a buscar
 *         required: true
 *         type: string
 *       - name: semanticTag
 *         in: query
 *         description: Filtra por uno o varios semantic tags
 *         required: false
 *         type: array
 *         items:
 *           type: string
 *       - name: limit
 *         in: query
 *         description: Limita la cantidad de registros
 *         required: false
 *         type: integer
 *         default: 100
 *       - name: skip
 *         in: query
 *         description: Indica la cantidad de registro a saltear
 *         required: false
 *         type: integer
 *         default: 0
 */
router.get('/snomed', function (req, res, next) {
    if (!req.query.search && !req.query.refsetId) {
        return next('Debe ingresar un parámetro de búsqueda');
    }
    let conditions = {
        lang: 'spanish',
        conceptActive: true,
        active: true
    };

    // Filtramos por semanticTag
    if (req.query.semanticTag) {
        conditions['$or'] = [...[], req.query.semanticTag].map((i) => { return { semanticTag: i }; });
    }

    // creamos un array de palabras a partir de la separacion del espacio
    if (req.query.search) {
        if (isNaN(req.query.search)) {
            // Busca por palabras
            conditions['$and'] = [];
            let words = req.query.search.split(' ');
            words.forEach(function (word) {
                // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                let expWord = '^' + utils.removeDiacritics(word) + '.*';

                // agregamos la palabra a la condicion
                conditions['$and'].push({ 'words': { '$regex': expWord } });
            });
        } else {
            // Busca por conceptId
            conditions['conceptId'] = req.query.search.toString();
        }
    } else {
        if (req.query.refsetId) {
            conditions['refsetIds'] = req.query.refsetId;
        }
    }

    // preparamos query
    let query = model.find(conditions, {
        conceptId: 1,
        term: 1,
        fsn: 1,
        semanticTag: 1,
        refsetIds: 1
    });

    // limitamos resultados
    query.limit(10000);
    query.sort({ term: 1 });
    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }

        // Eliminamos aquellos cuyo term sea igual al fsn (i.e. contiene el semanticTag)
        data = data.filter((i: any) => i.term !== i.fsn);

        // si es un búsqueda de palabras, ordenamos los resultados:
        //    llevamos hacia arriba los que tengan el largo de cadena
        //    mas corto, (deberia coincididr con lo que busco)
        if (isNaN(req.query.search)) {
            data.sort((a: any, b: any) => {
                if (a.term.length < b.term.length) { return -1; }
                if (a.term.length > b.term.length) { return 1; }
                return 0;
            });
        }
        let skip: number = parseInt(req.query.skip || 0, 10);
        res.json(data.slice(skip, req.query.limit || 100));
    });
});

/**
 * Mapea un concepto de snomed
 *
 * 248152002 -> Mujer
 * 248153007 -> Hombre
 * 445518008 -> Edad
 *
 * https://www.nlm.nih.gov/research/umls/mapping_projects/IMAGICImplementationGuide.pdf
 * https://github.com/andes/snomed-cie10
 *
 * @param {string} conceptId
 * @param {Ipaciente} paciente
 * @param {String[]} secondaryConcepts  Listado de concepto secundario para mejorar el mapeo.
 */

router.get('/snomed/map', function (req, res, next) {
    if (!req.query.conceptId) {
        return next('Debe ingresar un concepto principal');
    }

    let conceptId = req.query.conceptId;
    let paciente = req.query.paciente;
    let contexto = req.query.secondaryConcepts;

    let map = new SnomedCIE10Mapping(paciente, contexto);

    map.transform(conceptId).then(target => {
        cie10.model.findOne({ codigo: target }).then(cie => {
            res.json(cie);
        }).catch(err => {
            return next(err);
        });

    }).catch(error => {
        return next(error);
    });
});



export = router;
