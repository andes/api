import * as express from 'express';
import { TextIndexModel } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as cie10 from '../schemas/cie10';
import { SnomedCIE10Mapping } from './../controller/mapping';

const router = express.Router();

/**
 * @swagger
 * /snomed:
 *   get:
 *     tags:
 *       - "snomed"
 *     description: Una info
 *     summary: Búsqueda de conceptos de SNOMED
 *     security:
 *       - JWT: []
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

router.get('/snomed', (req, res, next) => {
    if (!req.query.search && !req.query.refsetId && req.query.search !== '') {
        return next('Debe ingresar un parámetro de búsqueda');
    }
    const conditions = {
        languageCode: 'spanish',
        conceptActive: true,
        active: true
    };
    // Filtramos por semanticTag
    if (req.query.semanticTag) {
        conditions['$or'] = [...[], req.query.semanticTag].map((i) => { return { semanticTag: i }; });
    }

    // creamos un array de palabras a partir de la separacion del espacio
    if (req.query.search) {
        req.query.search = req.query.search.toLowerCase();
        if (isNaN(req.query.search)) {
            // Busca por palabras
            conditions['$and'] = [];
            const words = req.query.search.split(' ');
            words.forEach((word) => {
                // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08').replace('ñ', 'n');
                const expWord = '^' + utils.removeDiacritics(word) + '.*';

                // agregamos la palabra a la condicion
                conditions['$and'].push({ words: { $regex: expWord } });
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
    const query = TextIndexModel.find(conditions, {
        conceptId: 1,
        term: 1,
        fsn: 1,
        semanticTag: 1,
        refsetIds: 1
    });

    // limitamos resultados
    query.limit(10000);
    query.sort({ term: 1 });
    query.exec((err, data) => {
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
        const skip: number = parseInt(req.query.skip || 0, 10);
        res.json(data.slice(skip, req.query.limit || 500));
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

router.get('/snomed/map', (req, res, next) => {
    if (!req.query.conceptId) {
        return next('Debe ingresar un concepto principal');
    }

    const conceptId = req.query.conceptId;
    const paciente = req.query.paciente;
    const contexto = req.query.secondaryConcepts;

    const map = new SnomedCIE10Mapping(paciente, contexto);

    map.transform(conceptId).then((target: string) => {
        if (target) {
            // Como los mapeos oficiles traen códigos tales como H47.019, S91.001?, ...
            // busca las opciones H47.19, S91.1?, ...
            let target2 = target.replace('.00', '.');
            let target3 = target.replace('.0', '.');
            cie10.model.findOne({ codigo: { $in: [target, target2, target3] } }).then(cie => {
                res.json(cie);
            }).catch(err => {
                return next(err);
            });
        } else {
            res.json(null);
        }
    }).catch(error => {
        return next(error);
    });
});


export = router;
