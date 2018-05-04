import * as express from 'express';
import { model as Organizaciones } from '../../../core/tm/schemas/organizacion';
import { model as Cie10 } from '../../../core/term/schemas/cie10';
import { makeFs } from '../schemas/CDAFiles';

import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';

import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';



import { Auth } from '../../../auth/auth.class';

let path = require('path');
let router = express.Router();
let to_json = require('xmljson').to_json;
/**
 * Genera un CDA con los datos provisto
 */

// {
//  "id": "asdasdasd"
// 	"prestacionSnomed": "1234556",
// 	"fecha": "2017-11-11 12:10:00",
// 	"texto": "esto es una prueba",
// 	"cie10": "A.1.1",
// 	"paciente": {
//      "id": "ID en la org",
// 		"nombre": "Mariano Andres",
// 		"apellido": "Botta",
// 		"sexo": "masculino",
// 		"documento": "34934522",
// 		"fechaNacimiento": "2017-10-10 12:12:12"
// 	},
// 	"profesional": {
// 		"id": "12345567",
// 		"nombre": "Huds",
// 		"apellido": "Doct1or",
//      "documento": "34344567",
//      "matricula": "255"
// 	},
// 	"file": "data:image/jpeg;base64,AEFCSADE2D2D2
// }

router.post('/create', cdaCtr.validateMiddleware, async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:post')) {
        return next(403);
    }

    try {
        let idPrestacion = req.body.id;
        let fecha = moment(req.body.fecha).toDate();
        let orgId = req.user.organizacion.id ? req.user.organizacion.id : req.user.organizacion;

        let yaExiste = await cdaCtr.CDAExists(idPrestacion, fecha, orgId);
        if (yaExiste) {
            return next({ error: 'prestacion_existente' });
        }

        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.profesional;

        // Devuelve un Loinc asociado al código SNOMED
        let prestacion = await cdaCtr.matchCode(req.body.prestacionSnomed);
        if (!prestacion) {
            return next({ error: 'prestacion_invalida' });
        }

        let cie10Code = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;

        // Terminar de decidir esto
        let organizacion = await Organizaciones.findById(orgId);
        let cie10 = null;
        if (cie10Code) {
            cie10 = await Cie10.findOne({ codigo: cie10Code });
            if (!cie10) {
                return next({ error: 'cie10_invalid' });
            }
        }

        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);
        let uniqueId = String(new mongoose.Types.ObjectId());

        let fileData, adjuntos;
        if (file) {
            let fileObj: any = cdaCtr.base64toStream(file);
            fileObj.metadata = {
                cdaId: mongoose.Types.ObjectId(uniqueId),
                paciente: mongoose.Types.ObjectId(paciente.id)
            };
            fileData = await cdaCtr.storeFile(fileObj);
            adjuntos = [{ path: fileData.data, id: fileData.id }];
        }

        let cda = cdaCtr.generateCDA(uniqueId, 'N', paciente, fecha, dataProfesional, organizacion, prestacion, cie10, texto, fileData);

        let metadata = {
            paciente: paciente._id,
            prestacion: prestacion,
            adjuntos: adjuntos,
            fecha: fecha,
            extras: {
                id: idPrestacion,
                organizacion: organizacion._id
            }
        };
        let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);

        res.json({ cda: uniqueId, paciente: paciente._id, date: metadata.fecha, idPrestacion: metadata.extras.id });

    } catch (e) {
        return next(e);
    }
});

/**
 * Injecta un CDA ya armado al repositorio
 */

router.post('/', async (req: any, res, next) => {
    let orgId = req.user.organizacion.id ? req.user.organizacion.id : req.user.organizacion;
    let cda64 = req.body.cda;
    let adjunto64 = req.body.adjunto;

    let cdaStream: any = cdaCtr.base64toStream(cda64);
    let cdaXml: String = await cdaCtr.streamToString(cdaStream.stream);

    if (cdaXml.length > 0) {
        cdaCtr.validateSchemaCDA(cdaXml).then(async (dom) => {

            let cdaData: any = cdaCtr.checkAndExtract(dom);

            if (cdaData) {
                let uniqueId = new mongoose.Types.ObjectId();

                if (cdaData.organizacion.id !== orgId) {
                    return next({ error: 'wrong_organization' });
                }

                cdaData.fecha = moment(cdaData.fecha, 'YYYYMMDDhhmmss').toDate();
                cdaData.paciente.fechaNacimiento = moment(cdaData.paciente.fechaNacimiento, 'YYYYMMDDhhmmss');
                cdaData.paciente.sexo = cdaData.paciente.sexo === 'M' ? 'masculino' : 'femenino';

                let yaExiste = await cdaCtr.CDAExists(cdaData.id, cdaData.fecha, orgId);
                if (yaExiste) {
                    return next({ error: 'prestacion_existente' });
                }

                // let organizacion = await Organizaciones.findById(orgId);

                // let dataProfesional = req.body.profesional;

                let prestacion = await cdaCtr.matchCodeByLoinc(cdaData.loinc);
                if (!prestacion) {
                    return next({ error: 'loinc_invalido' });
                }
                let paciente = await cdaCtr.findOrCreate(req, cdaData.paciente, orgId);

                let fileData, adjuntos;
                if (cdaData.adjunto && adjunto64) {
                    let fileObj: any = cdaCtr.base64toStream(adjunto64);
                    fileObj.metadata = {
                        cdaId: uniqueId,
                        paciente: mongoose.Types.ObjectId(paciente.id)
                    };
                    fileObj.filename = cdaData.adjunto;
                    fileData = await cdaCtr.storeFile(fileObj);
                    adjuntos = [{ path: fileData.data, id: fileData.id }];
                }

                let metadata = {
                    paciente: paciente._id,
                    prestacion: prestacion,
                    fecha: cdaData.fecha,
                    adjuntos: adjuntos,
                    extras: {
                        id: cdaData.id,
                        organizacion: mongoose.Types.ObjectId(orgId)
                    }
                };
                let obj = await cdaCtr.storeCDA(uniqueId, cdaXml, metadata);

                res.json({ cda: uniqueId, paciente: paciente._id });

            } else {
                return next({ error: 'cda_format_error' });
            }

        }).catch(next);
    } else {
        return next({ error: 'xml_file_missing' });
    }

});

/**
 * Devuelve el archivo de estilo para renderizar HTML desde el browser.
 */

router.get('/style/cda.xsl', (req, res, next) => {
    let name = path.join(__dirname, '../controller/cda.xsl');
    res.sendFile(name);
});


/**
 * Devuelve los archivos almacenados por los CDAs
 * Cuando se renderiza un CDA en el browser busca los archivos adjuntos en esta ruta
 * [DEPRECATED]
 */

router.get('/files/:name', async (req: any, res, next) => {
    if (req.user.type === 'user-token' && !Auth.check(req, 'cda:get')) {
        return next(403);
    }

    let name = req.params.name;
    let CDAFiles = makeFs();

    CDAFiles.findOne({ filename: name }).then(async file => {
        if (req.user.type === 'paciente-token' && String(file.metadata.paciente) !== String(req.user.pacientes[0].id)) {
            return next(403);
        }

        let stream1 = await CDAFiles.readById(file._id);
        res.contentType(file.contentType);
        stream1.pipe(res);
    }).catch(next);
});




/**
 * Devuelve el XML de un CDA según un ID
 */

router.get('/:id', async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:get')) {
        return next(403);
    }

    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await CDAFiles.findById(_base64);
    var stream1 = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


/**
 * Devuelve el CDA parseado a json según un ID
 */

router.get('/tojson/:id', async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:get')) {
        return next(403);
    }

    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await cdaCtr.loadCDA(_base64);
    to_json(contexto, function (error, data) {
        if (error) {
            return next(error);
        } else {
            res.json(data);
        }
    });
});

/**
 * Listado de los CDAs de un paciente
 * API demostrativa, falta analizar como se va a buscar en el repositorio
 */
router.get('/paciente/:id', async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:list')) {
        return next(403);
    }

    let CDAFiles = makeFs();
    let pacienteID = req.params.id;
    let prestacion = req.query.prestacion;

    let list = await cdaCtr.searchByPatient(pacienteID, prestacion, { skip: 0, limit: 10 });
    res.json(list);
});

/**
 * Devuelve los archivos almacenados por los CDAs
 * Cuando se renderiza un CDA en el browser busca los archivos adjuntos en esta ruta
 */

router.get('/:id/:name', async (req: any, res, next) => {

    if (req.user.type === 'user-token' && !Auth.check(req, 'cda:get')) {
        return next(403);
    }
    let id = mongoose.Types.ObjectId(req.params.id);
    let name = req.params.name;
    let CDAFiles = makeFs();

    let query = {
        filename: name,
        'metadata.cdaId': id
    };
    CDAFiles.findOne(query).then(async file => {
        if (req.user.type === 'paciente-token' && String(file.metadata.paciente) !== String(req.user.pacientes[0].id)) {
            return next(403);
        }

        let stream1 = await CDAFiles.readById(file._id);
        res.contentType(file.contentType);
        stream1.pipe(res);
    }).catch(next);
});



export = router;
