import * as express from 'express';
import { authOrganizaciones } from '../../../auth/schemas/organizacion';
import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';
import { makeFs } from '../schemas/CDAFiles';

import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

import { Auth } from '../../../auth/auth.class';

let router = express.Router();

router.post('/cda', Auth.authenticate(),  async (req: any, res, next) => {
    try {
        let orgId = req.user.organizacion;
        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.profesional;

        let snomed = req.body.tipoPrestacion;
        let fecha = moment(req.body.fecha).toDate();

        let cie10 = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;

        // Terminar de decidir esto
        let organizacion = await authOrganizaciones.findById(orgId);

        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);
        let uniqueId = String(new mongoose.Types.ObjectId());

        let cda = cdaCtr.generateCDA(uniqueId, paciente, fecha, dataProfesional, organizacion, snomed, cie10, texto, file);

        let obj = cdaCtr.storeCDA(uniqueId, cda, {} );

        res.json(obj);

    } catch (e) {
        next(e);
    }
});


router.post('/file', async (req: any, res, next) => {
    let _base64 = req.body.base64;
    let decoder = base64.decode();
    let input = new stream.PassThrough();

    let CDAFiles = makeFs();
    let objectID = new mongoose.Types.ObjectId();
    CDAFiles.write({
            _id: objectID,
            filename:  'hola.png' ,
            contentType: 'image/jpeg',
        },
        input.pipe(decoder),
        function(error, createdFile){
          res.json(createdFile);
    });

    input.end(_base64);

});

router.get('/file/:id', async (req: any, res, next) => {
    let _base64 = req.params.id;
    let CDAFiles = makeFs();

    let contexto = await CDAFiles.findById(_base64);
    var stream1  = CDAFiles.readById(_base64, function (err, buffer) {
        res.contentType(contexto.contentType);
        res.end(buffer);
    });
});


export = router;
