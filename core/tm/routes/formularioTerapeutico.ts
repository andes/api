import { toArray } from './../../../utils/utils';
import * as express from 'express';
import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as snomed from '../../term/schemas/snomed';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as utils from '../../../utils/utils';
import { log } from 'core-js/library/web/timers';
let router = express.Router();



router.get('/formularioTerapeutico/:id?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        formularioTerapeutico.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        let filtrados;
        let opciones = {};
        let proyeccion = {};
        if (req.query.capitulo) {
            opciones['capitulo'] = req.query.capitulo;
        }
        if (req.query.nombreMedicamento) {
            // opciones['subcapitulos.medicamentos.concepto.term'] = {
            //     '$regex': utils.makePattern(req.query.nombreMedicamento)
            // };
            // Busca por palabras
            if (isNaN(req.query.nombreMedicamento)) {

                opciones['$and'] = [];
                let words = String(req.query.nombreMedicamento).split(' ');
                words.forEach(function (word) {
                    // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                    word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                    let expWord = '^' + utils.removeDiacritics(word) + '.*';
                    // agregamos la palabra a la condicion
                    opciones['$and'].push({ 'subcapitulos.medicamentos.concepto.words': { '$regex': expWord } });
                });
            }
            proyeccion['subcapitulos.medicamentos.$'] = 1;
            proyeccion['capitulo'] = 1;
        }
        query = formularioTerapeutico.find(opciones, proyeccion);

        if (!Object.keys(query).length) {
            res.status(400).send('Debe ingresar al menos un parámetro');
            return next(400);
        }

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (req.query.nombreMedicamento) { // Si es una búsqueda por nombre de medicamento
                data.forEach(capitulo => {
                    capitulo.subcapitulos.forEach(subcapitulo => {
                        // El siguiente filter es necesario ya que en mongo no se pueden hacer proyecciones sobre arreglos anidados (o al menos eso entiendo)
                        filtrados = [];
                        subcapitulo.medicamentos.forEach(medicamento => {
                            let cont = 0;
                            let concepto = medicamento.concepto;
                            if (concepto.words && concepto.words.length > 0) {
                                let words = String(req.query.nombreMedicamento).split(' ');
                                // concepto.words.forEach(function (word) {
                                words.forEach(function (word) {
                                    // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                                    word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                                    let expWord = '^' + utils.removeDiacritics(word) + '.*';
                                    // agregamos la palabra a la condicion
                                    let aux = concepto.words.findIndex(w =>{
                                        return w.match(expWord) != null;
                                    });
                                    if (aux > 0) {
                                        cont++;
                                    }
                                    if (cont === words.length){
                                        filtrados.push(medicamento);
                                    }
                                });
                            }
                        });
                        subcapitulo.medicamentos = filtrados;
                    });

                });

            }
            res.json(data)
        });
    }
});

export = router;