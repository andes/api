import { toArray } from './../../../utils/utils';
import * as express from 'express';
import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as mongoose from 'mongoose';
import * as utils from '../../../utils/utils';
import * as formularioCtrl from '../controller/formularioTerapeutico';

const router = express.Router();

router.get('/formularioTerapeutico/:id?', async (req, res, next) => {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        formularioTerapeutico.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        const opciones = {};
        if (req.query.padre) {
            const arr = await formularioCtrl.getPadres(req.query.padre, []);
            res.json(arr);
        } else {
            if (req.query.nombreMedicamento) {
                // Parámetro texto ingresado
                if (isNaN(req.query.nombreMedicamento)) {

                    opciones['$and'] = [];
                    const words = String(req.query.nombreMedicamento).split(' ');
                    words.forEach((word) => {
                        // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                        word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                        const expWord = '^' + utils.removeDiacritics(word) + '.*';
                        // agregamos la palabra a la condicion
                        // opciones['$and'].push({ 'subcapitulos.medicamentos.concepto.words': { '$regex': expWord } });
                        opciones['$and'].push({ 'concepto.words': { $regex: '(?i)' + expWord } });
                    });
                }
            }
            // Parámetro Especialidad
            if (req.query.especialidad) {
                opciones['lespecialidades'] = String(req.query.especialidad);
            }
            // Parámetro Carro de Emergencia
            if (req.query.carro) {
                opciones['carro'] = Boolean(req.query.carro);
            }
            // Parámetro Nivel de Complejidad
            if (req.query.nivel) {
                opciones['nivelComplejidad'] = req.query.nivel;
            }
            // Parámetro vista de arbol
            if (req.query.tree) { // llevarlo a lado del controlador
                let data;
                let out = [];
                if (req.query.root) {
                    data = await toArray(formularioTerapeutico.aggregate(
                        [
                            { $match: { idpadre: mongoose.Types.ObjectId('5ac6512111764e32b35ad416') } },
                            {
                                $graphLookup: {
                                    from: 'formularioTerapeutico',
                                    startWith: '$_id',
                                    connectFromField: 'idpadre',
                                    connectToField: 'idpadre',
                                    as: 'arbol'
                                }
                            }
                        ]
                    ).cursor({}).exec());
                    out = [];
                    data.forEach((nodo, indiceNodo) => {
                        out.push(nodo);
                    });
                } else {
                    const idpadre = req.query.idpadre;
                    data = await toArray(formularioTerapeutico.aggregate(
                        [
                            { $match: { idpadre: mongoose.Types.ObjectId(idpadre) } },
                            {
                                $graphLookup: {
                                    from: 'formularioTerapeutico',
                                    startWith: '$_id',
                                    connectFromField: 'idpadre',
                                    connectToField: 'idpadre',
                                    as: 'arbol'
                                }
                            }
                        ]
                    ).cursor({}).exec());
                    out = [];
                    data.forEach((nodo, indiceNodo) => {
                        out.push(nodo);
                    });
                }
                res.json(out);
            } else {
                query = formularioTerapeutico.find(opciones);
                if (!Object.keys(query).length) {
                    res.status(400).send('Debe ingresar al menos un parámetro');
                    return next(400);
                }
                query.exec((err, data) => {
                    if (err) {
                        return next(err);
                    }
                    if (req.query.nombreMedicamento) { // Si es una búsqueda por nombre de medicamento
                    }
                    res.json(data);
                });
            }
        }

    }
});

export = router;
