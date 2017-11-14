import * as express from 'express';
import { authOrganizaciones } from '../../../auth/schemas/organizacion';
import * as pacienteCtr from '../../../core/mpi/controller/paciente';
import * as cdaCtr from '../controller/CDAPatient';
import { makeFs } from '../schemas/CDAFiles';

import * as stream from 'stream';
import * as base64 from 'base64-stream';
import * as mongoose from 'mongoose';

let router = express.Router();

router.post('/cda', async (req: any, res, next) => {

    try {
        let orgId = req.user.organizacion;
        let dataPaciente = req.body.paciente;
        let dataProfesional = req.body.paciente;

        let snomed = req.body.tipoPrestacion;
        let fecha = req.body.fecha;

        let cie10 = req.body.cie10;
        let file = req.body.file;
        let texto = req.body.texto;



        // Terminar de decidir esto
        let organizacion = await authOrganizaciones.findById(orgId);


        let paciente = await cdaCtr.findOrCreate(req, dataPaciente, organizacion._id);


        res.json({status: 'ok'});

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
    console.log(objectID);
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
