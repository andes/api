import * as express from 'express';
// import { TextIndexModel } from '../schemas/snomed';
import * as utils from '../../../utils/utils';
import * as cie10 from '../schemas/cie10';
import { SnomedCIE10Mapping } from './../controller/mapping';

import { SnomedCtr } from '../controller/snomed.controller';

const router = express.Router();

function asArray(item) {
    if (item) {
        return Array.isArray(item) ? item : [item];
    }
    return null;
}

router.get('/snomed', async (req, res, next) => {
    if (!req.query.search && req.query.search !== '' && req.query.expression) {
        return next('Debe ingresar un parámetro de búsqueda');
    }

    const semanticTags = asArray(req.query.semanticTag);
    const search = req.query.search;
    const expression = req.query.expression;
    const languageCode = req.query.languageCode || 'es';
    if (isNaN(search) || expression) {
        const conceptos = await SnomedCtr.searchTerms(search, { semanticTags, languageCode, expression });
        return res.json(conceptos);
    } else {
        const concepto = await SnomedCtr.getConcept(search, '');
        if (concepto) {
            return res.json([concepto]);
        }
        return res.json([]);
    }
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

router.post('/snomed/map', (req, res, next) => {
    if (!req.body.conceptId) {
        return next('Debe ingresar un concepto principal');
    }

    const conceptId = req.body.conceptId;
    const paciente = req.body.paciente;
    const contexto = req.body.secondaryConcepts;

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
            res.json([]);
        }
    }).catch(error => {
        return next(error);
    });
});


export = router;
