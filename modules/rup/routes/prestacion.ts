import { log } from './../../../core/log/schemas/log';
import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../schemas/prestacion';
import * as frecuentescrl from '../controllers/frecuentesProfesional';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import { buscarEnHuds, registrosProfundidad } from '../controllers/rup';
import { Logger } from '../../../utils/logService';
import { makeMongoQuery } from '../../../core/term/controller/grammar/parser';
import { SnomedModel } from '../../../core/term/schemas/snomed';
import * as camasController from './../controllers/cama';
import { parseDate } from './../../../shared/parse';
import { EventCore } from '@andes/event-bus';
import { dashboardSolicitudes } from '../controllers/estadisticas';
import async = require('async');

const router = express.Router();

/**
 * Trae todas las prestaciones con ambitoOrigen = internacion, tambien solo las prestaciones
 * internación y
 * que el paciente no tiene una cama asignada.
 */

router.get('/prestaciones/sinCama', (req, res, next) => {
    let query = {
        'solicitud.organizacion.id': mongoose.Types.ObjectId(Auth.getOrganization(req)),
        'solicitud.ambitoOrigen': 'internacion',
        'solicitud.tipoPrestacion.conceptId': '32485007',  // Ver si encontramos otra forma de diferenciar las prestaciones de internacion,
        'ejecucion.registros.valor.informeIngreso.fechaIngreso': {
            $gte: new Date(req.query.fechaDesde),
            $lte: new Date(req.query.fechaHasta)
        },
        $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + 'ejecucion' + '\"',
    };
    // Buscamos prestaciones que sean del ambito de internacion.
    Prestacion.find(query, async (err, prestaciones) => {
        if (err) {
            return next(err);
        }
        if (!prestaciones) {
            return res.status(404).send('No se encontraron prestaciones de internacion');
        }
        // Ahora buscamos si se encuentra asociada la internacion a una cama
        let listaEspera = [];
        let prestacion: any;
        for (prestacion of prestaciones) {
            let enEspera = {
                prestacion,
                ultimoEstado: null,
                paseDe: false,
                esEgreso: false,
                paseA: null,
                fechaIngreso: null,
            };
            enEspera.fechaIngreso = new Date(prestacion.ejecucion.registros[0].valor.informeIngreso.fechaIngreso);
            enEspera.paseA = prestacion.ejecucion.registros[0].valor.informeIngreso.PaseAunidadOrganizativa ? prestacion.ejecucion.registros[0].valor.informeIngreso.PaseAunidadOrganizativa : null;

            // Buscamos si tiene una cama ocupada con el id de la internacion.
            let cama = await camasController.buscarCamaInternacion(mongoose.Types.ObjectId(prestacion.id), 'ocupada');
            // Loopeamos los registros de la prestacion buscando el informe de egreso.
            let esEgreso = prestacion.ejecucion.registros.find(r => r.valor && r.valor.InformeEgreso);
            // Si no encontramos una cama ocupada quiere decir que esa prestacion va a formar parte
            // de nuestra lista.
            if (cama && cama.length === 0) {
                // Si encontramos el informe de ingreso en la prestacion entonces es
                // un egreso. En caso de que no sea ingreso utilizamos la funcion buscarPasesCamaXInternacion.
                if (esEgreso) {
                    enEspera.ultimoEstado = esEgreso.concepto.term;
                    enEspera.esEgreso = true;
                } else {
                    // Buscamos los pases que tiene la internacion
                    let _camas: any = await camasController.buscarPasesCamaXInternacion(prestacion._id);
                    if (_camas && _camas.length) {
                        enEspera.ultimoEstado = _camas[_camas.length - 1].estados.unidadOrganizativa.term;
                        enEspera.paseDe = _camas[_camas.length - 1].estados.unidadOrganizativa;
                        enEspera.paseA = _camas[_camas.length - 1].estados.sugierePase;
                    }
                }
                listaEspera.push(enEspera);
            }
        }
        return res.json(listaEspera);
    });
});


/***
 *  Buscar un determinado concepto snomed ya sea en una prestación especifica o en la huds completa de un paciente
 *
 * @param idPaciente: id mongo del paciente
 * @param estado: buscar en prestaciones con un estado distinto a validada
 * @param idPrestacion: buscar concepto/s en una prestacion especifica
 * @param expresion: expresion snomed que incluye los conceptos que estamos buscando
 *
 */

router.get('/prestaciones/huds/:idPaciente', async (req, res, next) => {

    // verificamos que sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Turno no encontrado');
    }

    // por defecto traemos todas las validadas, si no vemos el estado que viene en la request
    const estado = (req.query.estado) ? req.query.estado : 'validada';

    const query = {
        'paciente.id': req.params.idPaciente,
        $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
    };

    if (req.query.idPrestacion) {
        query['_id'] = mongoose.Types.ObjectId(req.query.idPrestacion);
    }

    if (req.query.deadline) {
        query['ejecucion.fecha'] = { $gte: moment(req.query.deadline).startOf('day').toDate() };
    }

    let conceptos: any = [];

    return Prestacion.find(query, (err, prestaciones) => {

        if (err) {
            return next(err);
        }

        if (!prestaciones) {
            return res.status(404).send('Paciente no encontrado');
        }

        if (req.query.expresion) {
            const querySnomed = makeMongoQuery(req.query.expresion);
            SnomedModel.find(querySnomed, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 }).then((docs: any[]) => {

                conceptos = docs.map((item) => {
                    const term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                    return {
                        fsn: item.fullySpecifiedName,
                        term,
                        conceptId: item.conceptId,
                        semanticTag: item.semtag
                    };
                });

                // ejecutamos busqueda recursiva
                const data = buscarEnHuds(prestaciones, conceptos);

                res.json(data);
            });
        }
    });
});


router.get('/prestaciones/resumenPaciente/:idPaciente', async (req, res, next) => {

    // verificamos que sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Turno no encontrado');
    }
    // por defecto traemos todas las validadas, si no vemos el estado que viene en la request
    const estado = (req.query.estado) ? req.query.estado : 'validada';

    let query = {
        'paciente.id': req.params.idPaciente,
        $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
    };

    if (req.query.idPrestacion) {
        query['_id'] = mongoose.Types.ObjectId(req.query.idPrestacion);
    }
    // 'filtroPrestaciones' va a contener un primer filtro con todas las consultas relacionadas a 'consultaPrincipal'
    let filtroPrestaciones: any = [];

    return Prestacion.find(query, async (err, prestaciones) => {

        if (err) {
            return next(err);
        }
        if (!prestaciones) {
            return res.status(404).send('Paciente no encontrado');
        }

        if (req.query.consultaPrincipal && req.query.conceptos) {
            let consultaPrincipal = req.query.consultaPrincipal;
            let conceptosBuscados = JSON.parse(req.query.conceptos);
            let querySnomed = makeMongoQuery(consultaPrincipal);
            let conceptosAux = [];
            let concepto;

            /* Se recorre el arreglo 'conceptosBuscados' para separar aquellos conceptos que son una expresion de snomed
            ya que requieren una consulta a su DB para traer los conceptos concretos que se buscarán */
            for (let i = 0; i < conceptosBuscados.length; i++) {
                concepto = conceptosBuscados[i];

                // si el concepto buscado es una expresion snomed ..
                if (!/^([0-9])+$/.test(concepto.conceptId)) {
                    let docs = await SnomedModel.find(makeMongoQuery(concepto.conceptId), { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 });

                    // Set de conceptos relacionados ..
                    let conceptosArray = docs.map((item: any) => {
                        let term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                        return {
                            fsn: item.fullySpecifiedName,
                            term,
                            conceptId: item.conceptId,
                            semanticTag: item.semtag
                        };
                    });
                    conceptosAux.push({ titulo: concepto.titulo, conceptos: conceptosArray });
                } else {
                    // Si no es una expresion snomed se almacena en un arreglo como unico elemento
                    conceptosAux.push({ titulo: concepto.titulo, conceptos: [concepto] });
                }
            }
            conceptosBuscados = conceptosAux;


            /* Los 'conceptosBuscados' que se quieren encontrar, son sólo los que pertenecen a la consulta 'consultaPrincipal',
                para esto se realiza el siguiente filtro mediante una consulta snomed */
            SnomedModel.find(querySnomed, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 }).then((docsCP: any[]) => {
                // Set de consultas relacionadas con 'consultaPrincipal'
                filtroPrestaciones = docsCP.map((item) => {
                    let term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
                    return {
                        fsn: item.fullySpecifiedName,
                        term,
                        conceptId: item.conceptId,
                        semanticTag: item.semtag
                    };
                });

                let data = [];

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
            });
        } else {
            return next(404);
        }
    });
});

router.post('/solicitudes/dashboard', async (req, res, next) => {
    const solicitudes = await dashboardSolicitudes(req.body, (req as any).user);
    return res.json(solicitudes);
});

router.get('/prestaciones/solicitudes', (req, res, next) => {
    let query;
    if (req.query.estados) {
        const estados = (typeof req.query.estados === 'string') ? [req.query.estados] : req.query.estados;
        query = Prestacion.find({
            $where: estados.map(x => 'this.estados[this.estados.length - 1].tipo ==  \"' + x + '"').join(' || '),
        });
    } else {
        query = Prestacion.find({}); // Trae todos
    }

    // Solicitudes tienen tipoPrestacionOrigen, entonces utilizamos esta propiedad
    // para filtrarlas de de la colección prestaciones
    // query.where('solicitud.tipoPrestacionOrigen.conceptId').exists(true); <<<<< cuando salgan de circulación solicitudes viejas la query es esta
    query.where('estados.0.tipo').in(['pendiente', 'auditoria']);
    if (req.query.tieneTurno !== undefined) {
        if (req.query.tieneTurno === true) {
            query.where('solicitud.turno').ne(null);
        }
        if (req.query.tieneTurno === false) {
            query.where('solicitud.turno').equals(null);
        }
    }

    if (req.query.idPaciente) {
        query.where('paciente.id').equals(req.query.idPaciente);
    }

    if (req.query.solicitudDesde) {
        query.where('solicitud.fecha').gte(moment(req.query.solicitudDesde).startOf('day').toDate() as any);
    }

    if (req.query.solicitudHasta) {
        query.where('solicitud.fecha').lte(moment(req.query.solicitudHasta).endOf('day').toDate() as any);
    }

    if (req.query.prestacionDestino) {
        query.where('solicitud.tipoPrestacion.id').equals(req.query.prestacionDestino);
    }

    query.where('solicitud.registros.0.esSolicitud').equals(false);


    if (req.query.organizacionOrigen) {
        const arr: any[] = [];
        arr.push({ 'solicitud.organizacionOrigen': { $exists: true } });
        arr.push({ 'solicitud.organizacionOrigen.id': req.query.organizacionOrigen });
        query.and(arr);
    }

    if (req.query.tipoPrestaciones) {
        const variable: any[] = [];
        variable.push({ 'solicitud.tipoPrestacion.id': { $in: req.query.tipoPrestaciones } });
        variable.push({ 'solicitud.tipoPrestacionOrigen.id': { $in: req.query.tipoPrestaciones } });
        query.or(variable);
    }

    // Ordenar por fecha de solicitud
    if (req.query.ordenFecha || req.query.ordenFechaAsc) {
        query.sort({ 'solicitud.fecha': -1 });
    } else if (req.query.ordenFechaDesc) {
        query.sort({ 'solicitud.fecha': 1 });
    } else if (req.query.ordenFechaEjecucion) {
        query.sort({ 'ejecucion.fecha': -1 });
    }


    if (req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        if (req.params.id && !data) {
            return next(404);
        }
        res.json(data);
    });
});

router.get('/prestaciones/:id*?', async (req, res, next) => {
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

router.post('/prestaciones', (req, res, next) => {
    let dto = parseDate(JSON.stringify(req.body));
    const data = new Prestacion(dto);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
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

                const dto = {
                    profesional: Auth.getProfesional(req),
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    organizacion: prestacion.solicitud.organizacion,
                    frecuentes: req.body.registros
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
