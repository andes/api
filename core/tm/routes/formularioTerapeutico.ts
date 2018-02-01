import { toArray } from './../../../utils/utils';
import * as express from 'express';
import * as formularioTerapeutico from '../schemas/formularioTerapeutico';
import * as snomed from '../../term/schemas/snomed';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as utils from '../../../utils/utils';
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
                    opciones['$and'].push({ 'subcapitulos.medicamentos.concepto.term': { '$regex': expWord } });
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
                    console.log(capitulo.capitulo);
                    capitulo.subcapitulos.forEach(subcapitulo => {
                        let resu = true;
                        filtrados = subcapitulo.medicamentos.filter(m => {
                            let words = String(req.query.nombreMedicamento).split(' ');
                            words.forEach(function (word) {
                                // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
                                word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
                                let expWord = '^' + utils.removeDiacritics(word) + '.*';

                                // agregamos la palabra a la condicion
                                if (resu !== false){
                                    resu = m.concepto.term.match(expWord) !== null;
                                }
                                // opciones['$and'].push({ 'subcapitulos.medicamentos.concepto.term': { '$regex': expWord } });
                            });
                            console.log(resu);
                            // return (m.concepto.term.match(utils.makePattern(req.query.nombreMedicamento)) !== null)
                            return (resu)
                            
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