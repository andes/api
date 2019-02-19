import * as express from 'express';
import * as mongoose from 'mongoose';
import { Connections } from './../../../connections';
import { model } from '../../tm/schemas/organizacion';
import * as agendaModel from '../../../modules/turnos/schemas/agenda';

const router = express.Router();

router.get('/', (req, res, next) => {
    res.json({
        API: 'OK',
        DB: Connections.main.readyState !== 1 ? 'Error' : 'OK',
        MPI: Connections.mpi.readyState !== 1 ? 'Error' : 'OK',
    });
});

router.get('/mapa', (req, res, next) => {
    model.find({ 'tipoEstablecimiento._id': mongoose.Types.ObjectId('5894b7e04633bf3dbc04312b') }, { nombre: true, direccion: true }).then((data) => {
        res.json(data);
    }, (err) => {
        return next(err);
    });


    // model.find({'tipoEstablecimiento._id': mongoose.Types.ObjectId('5894b7e04633bf3dbc04312b')}, { nombre: true, direccion: true }).then(
    //     async (organizaciones: any) => {
    //         try {
    //             let resultado = [];
    //             for (let i = 0; i < organizaciones.length; i++) {
    //                 let organizacion: any = organizaciones[i].toObject();
    //                 organizacion.status = {
    //                     mpi: true,
    //                     citas: true,
    //                     mobile: true,
    //                     rup: true,
    //                     top: true,
    //                     connect: true,
    //                 };
    //                 resultado.push(organizacion);

    //                 // await Promise.all([consulta1, consulta2]).then(data => {
    //                 //     organizacion.status.mpi = data[0];
    //                 // });

    //                 // Consulta si tiene agendas creadas
    //                 let agendas = await agendaModel.find({'organizacion._id': organizacion._id}).limit(1);
    //                 organizacion.status.citas = (agendas.length > 0);

    //                 //

    //                 ///
    //             }
    //             res.json(resultado);
    //         } catch (err) {
    //             return next(err);
    //         }
    //     },
    //     (err) => {
    //         return next(err);
    //     });
});

module.exports = router;
