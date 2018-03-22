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

/**
 * Genera un CDA con los datos provisto
 */

// {
// 	"prestacion": "1234556",
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
// 		"apellido": "Doct1or"
// 	},
// 	"file": "data:image/jpeg;base64,AEFCSADE2D2D2
// }

router.post('/', cdaCtr.validateMiddleware, async (req: any, res, next) => {
    if (!Auth.check(req, 'cda:post')) {
        return next(403);
    }

    try {
        let orgId = req.user.organizacion;
        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.profesional;

        let snomed = req.body.prestacion;
        let fecha = moment(req.body.fecha).toDate();

        let cie10Code = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;

        // Terminar de decidir esto
        let organizacion = await Organizaciones.findById(orgId);
        let cie10 = await Cie10.findOne({ codigo: cie10Code });
        if (!cie10) {
            throw new Error('cie10_invalid');
        }

        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);
        let uniqueId = String(new mongoose.Types.ObjectId());

        let fileData;
        if (file) {
            let fileObj: any = cdaCtr.base64toStream(file);
            fileObj.cdaId = uniqueId;
            fileData = await cdaCtr.storeFile(fileObj);
        }

        let cda = cdaCtr.generateCDA(uniqueId, 'N', paciente, fecha, dataProfesional, organizacion, snomed, cie10, texto, fileData);

        let metadata = {
            paciente: paciente._id,
            prestacion: snomed,
            fecha: fecha,
            adjuntos: [{ path: fileData.data, id: fileData.id }]
        };
        let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);

        res.json({ cda: uniqueId, paciente: paciente._id });

    } catch (e) {
        next(e);
    }
});

router.get('/style/cda.xsl', (req, res, next) => {
    let name = path.join(__dirname, '../controller/cda.xsl');
    res.sendFile(name);
});


/**
 * Devuelve los archivos almacenados por los CDAs
 * Cuando se renderiza un CDA en el browser busca los archivos adjuntos en esta ruta
 */

router.get('/files/:name', async (req: any, res, next) => {
    // if (!Auth.check(req, 'cda:get')) {
    //     return next(403);
    // }

    let name = req.params.name;
    let CDAFiles = makeFs();

    CDAFiles.findOne({filename: name}).then(async file => {
        let stream1  = await CDAFiles.readById(file._id);
        res.contentType(file.contentType);
        stream1.pipe(res);
    }).catch(next);
});


/**
 * Devuelve el XML de un CDA según un ID
 */

router.get('/:id', async (req: any, res, next) => {
    // if (!Auth.check(req, 'cda:get')) {
    //     return next(403);
    // }

    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await CDAFiles.findById(_base64);
    var stream1 = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
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

    let list = await cdaCtr.searchByPatient(pacienteID, prestacion, {skip: 0, limit: 10});
    res.json(list);
});

export = router;
