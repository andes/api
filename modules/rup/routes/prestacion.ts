import { Types } from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../schemas/prestacion';
import { updateRegistroHistorialSolicitud } from '../controllers/prestacion';
import * as frecuentescrl from '../controllers/frecuentesProfesional';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import { buscarEnHuds, registrosProfundidad } from '../controllers/rup';
import { Logger } from '../../../utils/logService';
import { parseDate } from './../../../shared/parse';
import { EventCore } from '@andes/event-bus';
import { dashboardSolicitudes } from '../controllers/estadisticas';
import async = require('async');
import { removeDiacritics } from '../../../utils/utils';
import { SnomedCtr } from '../../../core/term/controller/snomed.controller';


const router = express.Router();

/***
 *  Buscar un determinado concepto snomed ya sea en una prestación especifica o en la huds completa de un paciente
 *
 * @param idPaciente: id mongo del paciente
 * @param estado: buscar en prestaciones con un estado distinto a validada
 * @param idPrestacion: buscar concepto/s en una prestacion especifica
 * @param expresion: expresion snomed que incluye los conceptos que estamos buscando
 *
 */

router.get('/prestaciones/huds/:idPaciente', async (req: any, res, next) => {

    // verificamos que sea un ObjectId válido
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Turno no encontrado');
    }

    try {
        // por defecto traemos todas las validadas, si no vemos el estado que viene en la request
        const estado = req.query.estado ? req.query.estado : 'validada';

        const query = {
            'paciente.id': req.params.idPaciente,
            $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
        };

        if (req.query.idPrestacion) {
            query['_id'] = Types.ObjectId(req.query.idPrestacion);
        }

        if (req.query.deadline) {
            query['ejecucion.fecha'] = { $gte: moment(req.query.deadline).startOf('day').toDate() };
        }


        const prestaciones = await Prestacion.find(query);


        if (!prestaciones) {
            return res.status(404).send('Paciente no encontrado');
        }

        if (req.query.expresion) {
            const conceptos = await SnomedCtr.getConceptByExpression(req.query.expresion);
            const data = buscarEnHuds(prestaciones, conceptos);
            return res.json(data);
        }
    } catch (e) {
        return next(e);
    }
});


router.get('/prestaciones/resumenPaciente/:idPaciente', async (req: any, res, next) => {

    // verificamos que sea un ObjectId válido
    if (!Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Turno no encontrado');
    }
    // por defecto traemos todas las validadas, si no vemos el estado que viene en la request
    const estado = (req.query.estado) ? req.query.estado : 'validada';

    let query = {
        'paciente.id': req.params.idPaciente,
        $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
    };

    if (req.query.idPrestacion) {
        query['_id'] = Types.ObjectId(req.query.idPrestacion);
    }

    const prestaciones = await Prestacion.find(query);

    if (req.query.consultaPrincipal && req.query.conceptos) {
        const consultaPrincipal = req.query.consultaPrincipal;
        let conceptosBuscados = JSON.parse(req.query.conceptos);
        const conceptosAux = [];
        let concepto;

        /* Se recorre el arreglo 'conceptosBuscados' para separar aquellos conceptos que son una expresion de snomed
        ya que requieren una consulta a su DB para traer los conceptos concretos que se buscarán */
        for (let i = 0; i < conceptosBuscados.length; i++) {
            concepto = conceptosBuscados[i];

            // si el concepto buscado es una expresion snomed ..
            if (!/^([0-9])+$/.test(concepto.conceptId)) {
                const conceptosArray = await SnomedCtr.getConceptByExpression(concepto.conceptId);
                conceptosAux.push({ titulo: concepto.titulo, conceptos: conceptosArray });
            } else {
                // Si no es una expresion snomed se almacena en un arreglo como unico elemento
                conceptosAux.push({ titulo: concepto.titulo, conceptos: [concepto] });
            }
        }
        conceptosBuscados = conceptosAux;


        /* Los 'conceptosBuscados' que se quieren encontrar, son sólo los que pertenecen a la consulta 'consultaPrincipal',
            para esto se realiza el siguiente filtro mediante una consulta snomed */

        const filtroPrestaciones = await SnomedCtr.getConceptByExpression(consultaPrincipal);

        const data = [];

        // Para cada prestación del paciente se busca si contiene una 'consultaPrincipal'
        prestaciones.forEach((prestacion: any) => {
            let registros = [];
            let motivoConsulta;
            let resultBusqueda = [];
            // recorremos los registros de cada prestacion del paciente.
            prestacion.ejecucion.registros.forEach(reg => {
                // Si alguna prestación matchea con una de las anteriormente filtradas..
                if (filtroPrestaciones.find(fp => fp.conceptId === reg.concepto.conceptId)) {
                    motivoConsulta = { term: reg.concepto.term, conceptId: reg.concepto.conceptId };
                    let dto;
                    /* Por cada concepto buscado se genera un obj json para retornar. Si el concepto no fue encontrado
                        se inserta de todas maneras con 'contenido' nulo para conservar registro del resultado */
                    conceptosBuscados.forEach(conceptos => {
                        dto = { titulo: conceptos.titulo, contenido: null };
                        resultBusqueda = registrosProfundidad(reg, conceptos.conceptos);

                        if (resultBusqueda.length) {
                            dto.contenido = resultBusqueda[0];
                        }
                        registros.push(dto);
                    });

                    if (registros.length) {
                        // se agrega la prestacion y los conceptos matcheados al arreglo a retornar
                        data.push({
                            motivo: motivoConsulta,
                            fecha: prestacion.createdAt,
                            profesional: prestacion.createdBy,
                            conceptos: registros
                        });
                    }
                }
            });
        });
        res.json(data);

    } else {
        return next(404);
    }
});

router.post('/solicitudes/dashboard', async (req, res, next) => {
    const solicitudes = await dashboardSolicitudes(req.body, (req as any).user);
    return res.json(solicitudes);
});

router.get('/prestaciones/solicitudes', async (req: any, res, next) => {
    try {
        let pipeline = [];
        let match: any = { $and: [] };

        if (req.query.solicitudDesde) {
            match.$and.push({ 'solicitud.fecha': { $gte: (moment(req.query.solicitudDesde).startOf('day').toDate() as any) } });
        }

        if (req.query.solicitudHasta) {
            match.$and.push({ 'solicitud.fecha': { $lte: (moment(req.query.solicitudHasta).endOf('day').toDate() as any) } });
        }

        if (req.query.pacienteDocumento) {
            match.$and.push({ 'paciente.documento': { $eq: req.query.pacienteDocumento } });
        }

        if (req.query.origen === 'top') {
            match.$and.push({ 'solicitud.prestacionOrigen': { $exists: false } });
        }

        match.$and.push({ 'estados.0.tipo': { $in: ['pendiente', 'auditoria'] } });

        if (req.query.tieneTurno !== undefined) {
            match.$and.push({ 'solicitud.turno': req.query.tieneTurno ? { $ne: null } : { $eq: null } });
        }

        if (req.query.organizacion) {
            if (req.query.remitidas) {
                match.$and.push({
                    $or: [
                        { 'solicitud.organizacion.id': Types.ObjectId(req.query.organizacion) },
                        { 'solicitud.historial': {
                            $elemMatch: {
                                $and: [
                                    { accion: 'remisionSolicitud' },
                                    { 'createdBy.organizacion._id': req.query.organizacion }
                                ]
                            }
                        }}
                    ]
                });

            } else {
                match.$and.push({ 'solicitud.organizacion.id': Types.ObjectId(req.query.organizacion) });
            }
        }

        if (req.query.organizacionOrigen) {
            match.$and.push({ 'solicitud.organizacionOrigen.id': Types.ObjectId(req.query.organizacionOrigen) });
        }

        if (req.query.prioridad) {
            match.$and.push({ 'solicitud.registros.0.valor.solicitudPrestacion.prioridad': req.query.prioridad });
        }

        if (req.query.idPaciente) {
            match.$and.push({ 'paciente.id': Types.ObjectId(req.query.idPaciente) });
        }

        if (req.query.idProfesional) {
            match.$and.push({ 'solicitud.profesional.id': Types.ObjectId(req.query.idProfesional) });
        }

        if (req.query.idProfesionalOrigen) {
            match.$and.push({ 'solicitud.profesionalOrigen.id': Types.ObjectId(req.query.idProfesionalOrigen) });
        }

        if (req.query.prestacionDestino) {
            match.$and.push({ 'solicitud.tipoPrestacion.id': { $eq: Types.ObjectId(req.query.prestacionDestino) } });
        }

        if (req.query.tipoPrestaciones) {
            let tipoPrestaciones = req.query.tipoPrestaciones;
            tipoPrestaciones = Array.isArray(tipoPrestaciones) ? tipoPrestaciones : [tipoPrestaciones];
            match.$and.push({
                $or: [{ 'solicitud.tipoPrestacion.id': { $in: tipoPrestaciones.map(e => Types.ObjectId(e)) } },
                { 'solicitud.tipoPrestacionOrigen.id': { $in: tipoPrestaciones.map(e => Types.ObjectId(e)) } }]
            });
        }

        pipeline.push({ $match: match });

        if (req.query.estados) {
            pipeline.push({ $addFields: { lastState: { $arrayElemAt: ['$estados', -1] } } });
            pipeline.push({ $match: { 'lastState.tipo': { $in: (typeof req.query.estados === 'string') ? [req.query.estados] : req.query.estados } } });
        }

        pipeline.push({ $addFields: { registroSolicitud: { $arrayElemAt: ['$solicitud.registros', 0] } } });
        let project = {
            $project: {
                id: '$_id',
                paciente: 1,
                solicitud: 1,
                ejecucion: 1,
                noNominalizada: 1,
                estados: 1,
                createdAt: 1,
                createdBy: 1,
                updatedAt: 1,
                updatedBy: 1,
                lastState: 1,
                esPrioritario: {
                    $cond: {
                        if: { $eq: ['$registroSolicitud.valor.solicitudPrestacion.prioridad', 'prioritario'] },
                        then: -1,
                        else: 1
                    }
                }
            }
        };

        if (req.query.paciente && !Types.ObjectId.isValid(req.query.paciente)) {
            (project.$project as any).datosPaciente = { $concat: ['$paciente.nombre', ' ', '$paciente.apellido', ' ', '$paciente.documento'] };
        }

        pipeline.push(project);

        if (req.query.paciente) {
            if (Types.ObjectId.isValid(req.query.paciente)) {
                pipeline.push({
                    $match: { 'paciente.id': Types.ObjectId(req.query.paciente) }
                });
            } else {
                let conditions = {};
                conditions['$and'] = [];
                const words = req.query.paciente.toUpperCase().split(' ');
                words.forEach((word) => {
                    word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08').replace('ñ', 'n');
                    const expWord = removeDiacritics(word) + '.*';
                    conditions['$and'].push({ datosPaciente: { $regex: expWord } });
                });

                pipeline.push({
                    $match: conditions
                });
            }
        }

        let sort = {};
        sort['esPrioritario'] = 1;

        if (req.query.ordenFecha || req.query.ordenFechaAsc) {
            sort['solicitud.fecha'] = -1;
        } else if (req.query.ordenFechaDesc) {
            sort['solicitud.fecha'] = 1;
        } else if (req.query.ordenFechaEjecucion) {
            sort['ejecucion.fecha'] = -1;
        }

        pipeline.push({ $sort: sort });

        if (req.query.skip) {
            pipeline.push({ $skip: parseInt(req.query.skip, 10) });
        }

        if (req.query.limit) {
            pipeline.push({ $limit: parseInt(req.query.limit, 10) });
        }

        res.json(await Prestacion.aggregate(pipeline).allowDiskUse(true));
    } catch (err) {
        return next(404);
    }
});

router.get('/prestaciones/:id*?', async (req: any, res, next) => {

    if (req.params.id) {
        const query = Prestacion.findById(req.params.id);
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    } else {
        let query;
        if (req.query.estado) {
            const estados = (typeof req.query.estado === 'string') ? [req.query.estado] : req.query.estado;
            query = Prestacion.find({
                // $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + req.query.estado + '\"',
                $where: estados.map(x => 'this.estados[this.estados.length - 1].tipo ==  \"' + x + '"').join(' || '),
            });
        } else {
            query = Prestacion.find({}); // Trae todos
        }

        if (req.query.sinEstado) {
            query.where('estados.tipo').ne(req.query.sinEstado);
        }
        if (req.query.fechaDesde) {
            // query.where('createdAt').gte(moment(req.query.fechaDesde).startOf('day').toDate() as any);
            query.where('ejecucion.fecha').gte(moment(req.query.fechaDesde).startOf('day').toDate() as any);
        }
        if (req.query.fechaHasta) {
            // query.where('createdAt').lte(moment(req.query.fechaHasta).endOf('day').toDate() as any);
            query.where('ejecucion.fecha').lte(moment(req.query.fechaHasta).endOf('day').toDate() as any);
        }
        if (req.query.idProfesional) {
            query.where('solicitud.profesional.id').equals(req.query.idProfesional);
        }
        if (req.query.idPaciente) {
            let { paciente } = await buscarPaciente(req.query.idPaciente);
            if (paciente) {
                query.where('paciente.id').in(paciente.vinculos);
            }
        }
        if (req.query.idPrestacionOrigen) {
            query.where('solicitud.prestacionOrigen').equals(req.query.idPrestacionOrigen);
        }
        if (req.query.conceptId) {
            query.where('solicitud.tipoPrestacion.conceptId').equals(req.query.conceptId);
        }
        if (req.query.turnos) {
            query.where('solicitud.turno').in(req.query.turnos);
        }

        if (req.query.conceptsIdEjecucion) {
            query.where('ejecucion.registros.concepto.conceptId').in(req.query.conceptsIdEjecucion);
        }

        if (req.query.solicitudDesde) {
            query.where('solicitud.fecha').gte(moment(req.query.solicitudDesde).startOf('day').toDate() as any);
        }

        if (req.query.solicitudHasta) {
            query.where('solicitud.fecha').lte(moment(req.query.solicitudHasta).endOf('day').toDate() as any);
        }


        if (req.query.tienePrestacionOrigen !== undefined) {
            if (req.query.tienePrestacionOrigen === true) {
                query.where('solicitud.prestacionOrigen').ne(null);
            }
            if (req.query.tienePrestacionOrigen === false) {
                query.where('solicitud.prestacionOrigen').equals(null);
            }
        }


        if (req.query.tieneTurno !== undefined) {
            if (req.query.tieneTurno === true) {
                query.where('solicitud.turno').ne(null);
            }
            if (req.query.tieneTurno === false) {
                query.where('solicitud.turno').equals(null);
            }
        }

        if (req.query.tipoPrestaciones) {
            query.where({ 'solicitud.tipoPrestacion.conceptId': { $in: req.query.tipoPrestaciones } });
        }

        if (req.query.organizacion) {
            query.where('solicitud.organizacion.id').equals(req.query.organizacion);
        }
        if (req.query.ambitoOrigen) {
            query.where('solicitud.ambitoOrigen').equals(req.query.ambitoOrigen);
        }

        // Ordenar por fecha de solicitud
        if (req.query.ordenFecha) {
            query.sort({ 'solicitud.fecha': -1 });
        } else if (req.query.ordenFechaEjecucion) {
            query.sort({ 'ejecucion.fecha': -1 });
        }

        if (req.query.limit) {
            query.limit(parseInt(req.query.limit, 10));
        }

        if (req.query.id) {
            query.where('_id').equals(req.query.id);
        }

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            if (req.params.id && !data) {
                return next(404);
            }
            if (data) {
                const profesional = Auth.getProfesional(req);
                const profesionalId = profesional && profesional.id && profesional.id.toString();
                for (let i = 0; i < data.length; i++) {
                    let profId = false;
                    if (data[i].solicitud.profesional && data[i].solicitud.profesional.id) {
                        profId = data[i].solicitud.profesional.id.toString();
                    }
                    const registros = data[i].ejecucion.registros;
                    if (registros) {
                        for (let j = 0; j < registros.length; j++) {
                            const privacy = registros[j].privacy || { scope: 'public' };
                            if (privacy.scope !== 'public' && profesionalId !== profId) {
                                switch (privacy.scope) {
                                    case 'private':
                                        registros.splice(j, 1);
                                        j--;
                                        break;
                                    case 'termOnly':
                                        registros[j].valor = 'REGISTRO PRIVADO';
                                        registros[j].registros = [];
                                        break;
                                }
                            }
                        }
                    }
                }
            }
            res.json(data);
        });
    }
});

router.post('/prestaciones', async (req, res, next) => {
    let dto = parseDate(JSON.stringify(req.body));
    const data = new Prestacion(dto);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next('No fue posible crear la prestación');
        }
        res.json(data);
        EventCore.emitAsync('rup:prestacion:create', data);
    });
});

router.patch('/prestaciones/:id', (req, res, next) => {
    Prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }
        req.body = parseDate(JSON.stringify(req.body));
        switch (req.body.op) {
            case 'paciente':
                if (req.body.paciente) {
                    data.paciente = req.body.paciente;
                }
                break;
            case 'estadoPush':
                if (req.body.estado) {
                    if (data.estados[data.estados.length - 1].tipo === 'validada') {
                        return next('Prestación validada, no se puede volver a validar.');
                    }
                    data['estados'].push(req.body.estado);
                    if (req.body.estado.tipo === 'asignada') {
                        if (req.body.profesional) {
                            data.solicitud.profesional = req.body.profesional;
                        }

                        updateRegistroHistorialSolicitud(data.solicitud, 'asignacionProfesional');
                    }
                }
                if (req.body.registros) {
                    data.ejecucion.registros = req.body.registros;
                }
                if (req.body.ejecucion && req.body.ejecucion.fecha) {
                    data.ejecucion.fecha = req.body.ejecucion.fecha;
                }
                if (req.body.ejecucion && req.body.ejecucion.organizacion) {
                    data.ejecucion.organizacion = req.body.ejecucion.organizacion;
                }
                if (req.body.prioridad) {
                    data.solicitud.registros[0].valor.solicitudPrestacion.prioridad = req.body.prioridad;
                    data.solicitud.registros[0].markModified('valor');
                }
                break;
            case 'romperValidacion':
                if (data.estados[data.estados.length - 1].tipo !== 'validada') {
                    return next('Para poder romper la validación, primero debe validar la prestación.');
                }
                if (!req.body.desdeInternacion) {
                    if ((req as any).user.usuario.username !== data.estados[data.estados.length - 1].createdBy.documento) {
                        return next('Solo puede romper la validación el usuario que haya creado.');
                    }
                }
                data.estados.push(req.body.estado);
                break;
            case 'registros':
                if (req.body.registros) {
                    data.ejecucion.registros = req.body.registros;

                    if (req.body.solicitud) {
                        data.solicitud = req.body.solicitud;
                    }
                }
                break;
            case 'informeIngreso':
                if (req.body.informeIngreso) {
                    data.ejecucion.registros[0].valor.informeIngreso = req.body.informeIngreso;
                    data.ejecucion.registros[0].markModified('valor');
                }
                break;
            case 'asignarTurno':
                if (req.body.idTurno) {
                    data.solicitud.turno = req.body.idTurno;
                }
                break;
            case 'remitir':
                updateRegistroHistorialSolicitud(data.solicitud, 'remisionSolicitud');
                if (req.body.estado) {
                    data.estados.push();
                }

                data.solicitud.profesional = req.body.profesional;
                data.solicitud.organizacion = req.body.organizacion;
                data.solicitud.tipoPrestacion = req.body.tipoPrestacion;
                break;
            default:
                return next(500);
        }
        Auth.audit(data, req);
        data.save(async (error, prestacion: any) => {
            if (error) {
                return next(error);
            }

            if (req.body.estado && req.body.estado.tipo === 'validada') {

                /* Este evento habilita la facturación automática desde RUP */
                // const origen = 'rup_rf';
                // EventCore.emitAsync('facturacion:factura:create', (<any>Object).assign({ origen, data }));

                EventCore.emitAsync('rup:prestacion:validate', data);
            }

            // Actualizar conceptos frecuentes por profesional y tipo de prestacion
            if (req.body.registrarFrecuentes && req.body.registros) {

                const registros = prestacion.getRegistros();

                const dto = {
                    profesional: Auth.getProfesional(req),
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    organizacion: prestacion.solicitud.organizacion,
                    frecuentes: registros
                };
                frecuentescrl.actualizarFrecuentes(dto).then(() => {
                    Logger.log(req, 'rup', 'update', {
                        accion: 'actualizarFrecuentes',
                        ruta: req.url,
                        method: req.method,
                        data: req.body.listadoFrecuentes,
                        err: false
                    });
                }).catch((errFrec) => {
                    return next(errFrec);
                });

            }

            if (req.body.op === 'romperValidacion') {
                const _prestacion = data;
                EventCore.emitAsync('rup:prestacion:romperValidacion', _prestacion);
            }

            if (req.body.planes) {
                // creamos una variable falsa para cuando retorne hacer el get
                // de todas estas prestaciones

                const solicitadas = [];

                async.each(req.body.planes, (plan, callback) => {
                    const nuevoPlan = new Prestacion(plan);

                    Auth.audit(nuevoPlan, req);
                    nuevoPlan.save((errorPlan, nuevaPrestacion) => {
                        if (errorPlan) { return callback(errorPlan); }

                        solicitadas.push(nuevaPrestacion);

                        callback();

                    });
                }, (err2) => {
                    if (err2) {
                        return next(err2);
                    }

                    // como el objeto de mongoose es un inmutable, no puedo agregar directamente una propiedad
                    // para poder retornar el nuevo objeto con los planes solicitados, primero
                    // debemos clonarlo con JSON.parse(JSON.stringify());
                    const convertedJSON = JSON.parse(JSON.stringify(prestacion));
                    convertedJSON.solicitadas = solicitadas;
                    res.json(convertedJSON);
                });

            } else {
                res.json(prestacion);
            }
            /*
            Logger.log(req, 'prestacionPaciente', 'update', {
                accion: req.body.op,
                ruta: req.url,
                method: req.method,
                data: data,
                err: err || false
            });
            */
        });
    });
});

export = router;
