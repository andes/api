import * as express from 'express';
import { authOrganizaciones } from '../../../auth/schemas/organizacion';
import { model as Cie10 } from '../../../core/term/schemas/cie10';
import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';

import { makeFs } from '../schemas/CDAFiles';

import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

import { Auth } from '../../../auth/auth.class';

let router = express.Router();

// {
// 	"snomed": "1234556",
// 	"fecha": "2017-11-11 12:10:00",
// 	"texto": "esto es una prueba",
// 	"cie10": "A.1.1",
// 	"paciente": {
//      "id": "ID en la org"
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
// 	"file": "data:image/jpeg;base64,ASDASDASDASDASDASDASD"
// }

router.post('/', Auth.authenticate(),  async (req: any, res, next) => {
    try {
        let orgId = req.user.organizacion;
        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.profesional;

        let snomed = req.body.tipoPrestacion;
        let fecha = moment(req.body.fecha).toDate();

        let cie10Code = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;

        // Terminar de decidir esto
        let organizacion = await authOrganizaciones.findById(orgId);
        let cie10 = await Cie10.findOne({codigo: cie10Code});

        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);
        let uniqueId = String(new mongoose.Types.ObjectId());

        let cda = cdaCtr.generateCDA(uniqueId, paciente, fecha, dataProfesional, organizacion, snomed, cie10, texto, file);

        let metadata = {
            paciente: paciente._id
        };
        let obj = await cdaCtr.storeCDA(uniqueId, cda, metadata);

        res.json({ cda: uniqueId, paciente: paciente._id });

    } catch (e) {
        next(e);
    }
});


// router.post('/file', async (req: any, res, next) => {
//     let _base64 = req.body.base64;
//     let decoder = base64.decode();
//     let input = new stream.PassThrough();

//     let CDAFiles = makeFs();
//     let objectID = new mongoose.Types.ObjectId();
//     CDAFiles.write({
//             _id: objectID,
//             filename:  'hola.png' ,
//             contentType: 'image/jpeg',
//         },
//         input.pipe(decoder),
//         function(error, createdFile){
//           res.json(createdFile);
//     });

//     input.end(_base64);
// });

router.get('/:id', async (req: any, res, next) => {
    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await CDAFiles.findById(_base64);
    var stream1  = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


export = router;
