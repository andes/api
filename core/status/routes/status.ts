import * as express from 'express';
import { Connections } from './../../../connections';
import { model } from '../../tm/schemas/organizacion';
import * as agendaModel from '../../../modules/turnos/schemas/agenda';
import { model as prestacionModel } from '../../../modules/rup/schemas/prestacion';
import * as reglasModel from '../../../modules/top/schemas/reglas';
import { pacienteMpi as pacienteModel } from '../../../core/mpi/schemas/paciente';


const router = express.Router();

router.get('/', (req, res, next) => {
    res.json({
        API: 'OK',
        DB: Connections.main.readyState !== 1 ? 'Error' : 'OK',
        MPI: Connections.mpi.readyState !== 1 ? 'Error' : 'OK',
    });
});

router.get('/mapa', (req, res, next) => {
    // model.find({ 'tipoEstablecimiento._id': mongoose.Types.ObjectId('5894b7e04633bf3dbc04312b') }, { nombre: true, direccion: true }).then((data) => {
    //     res.json(data);
    // }, (err) => {
    //     return next(err);
    // });


    // model.find({'tipoEstablecimiento._id': mongoose.Types.ObjectId('5894b7e04633bf3dbc04312b'),
    // 'direccion.geoReferencia': { $exists: true, $ne: [] }}, { nombre: true, direccion:  true }).then(
    //   model.find({'direccion.geoReferencia':{$exists:true, $ne:null}}, { nombre: true, direccion:  true }).then(
    model.find({
        'direccion.geoReferencia': { $exists: true, $ne: null }, $or: [{ 'tipoEstablecimiento.nombre': 'Hospital' }, { 'tipoEstablecimiento.nombre': 'Centro de Salud' }]
    }, { nombre: true, direccion: true }).then(
        async (organizaciones: any) => {
            try {
                let resultado = [];
                for (let i = 0; i < organizaciones.length; i++) {
                    // console.log(organizaciones[i]);
                    let organizacion: any = organizaciones[i].toObject();

                    organizacion.nombreCorto = organizacion.nombre;
                    organizacion.coordenadas = organizacion.direccion.geoReferencia;

                    // Declaro la propiedad status
                    organizacion.status = {
                        mpi: false,
                        citas: false,
                        mobile: false,
                        rup: false,
                        top: false
                        // connect: true,
                    };


                    // Consulta si tiene agendas creadas
                    let consultaCITAS = agendaModel.find({ 'organizacion._id': organizacion._id }).limit(1).exec();

                    // Consulta que indica si existe alguna agenda creada para la organización que tenga un bloque con un tipo de turnos mobile > 0
                    let queryMOBILE = { 'bloques.turnos.emitidoPor': 'appMobile', 'organizacion._id': organizacion._id };
                    let consultaMOBILE = agendaModel.find(queryMOBILE).limit(1).exec();

                    // Consulta que que indica si la organización tiene Registros asistenciales implementado
                    let queryRUP = { 'createdBy.organizacion.id': String(organizacion._id) };
                    let consultaRUP = prestacionModel.find(queryRUP).limit(1).exec();

                    // Consulta que indica si tiene Tránsito de pacientes implementado. El req dice qie solo vea el origen pero al consultar me dijeron busque tbn en el destino
                    let queryTOP = {
                        $or:
                        [{ 'origen.organizacion.id': organizacion._id },
                            { 'destino.organizacion.id': organizacion._id }
                        ]
                    };
                    let consultaTOP = reglasModel.find(queryTOP).limit(1).exec();


                    // Consulta que inidica si existe algún paciente que se haya creado o actualizado en la organización
                    let queryMPI = { 'createdBy.organizacion._id': String(organizacion._id) };
                    let consultaMIP = pacienteModel.find(queryMPI).limit(1).exec();

                    await Promise.all([consultaCITAS, consultaMOBILE, consultaRUP, consultaTOP, consultaMIP]).
                        then(data => {
                            organizacion.status.citas = data[0].length > 0;
                            organizacion.status.mobile = data[1].length > 0;
                            organizacion.status.rup = data[2].length > 0;
                            organizacion.status.top = data[3].length > 0;
                            organizacion.status.mpi = data[4].length > 0;
                        });
                    if (organizacion.status.citas || organizacion.status.rup || organizacion.status.mobile
                        || organizacion.status.top || organizacion.status.mpi) {
                        resultado.push(organizacion);
                    }
                }
                res.json(resultado);
            } catch (err) {
                return next(err);
            }
        },
        (err) => {
            return next(err);
        });
});

module.exports = router;
