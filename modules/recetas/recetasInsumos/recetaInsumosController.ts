import * as moment from 'moment';
import { Types } from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { RecetaInsumo } from './receta-insumo.schema';
import { createLog, informarLog, updateLog } from '../recetaLogs';
import { ParamsIncorrect, RecetaNotFound } from '../recetas.error';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { getProfesionActualizada } from '../recetasController';

export async function buscarRecetasInsumos(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;
    const pacienteId = params.pacienteId || null;
    const documento = params.documento || null;
    const sexo = params.sexo || null;
    try {
        if ((!pacienteId && (!documento || !sexo)) || (pacienteId && !Types.ObjectId.isValid(pacienteId))) {
            throw new ParamsIncorrect();
        }
        const paramMap = {
            id: '_id',
            pacienteId: 'paciente.id',
            documento: 'paciente.documento',
            sexo: 'paciente.sexo',
            estado: 'estadoActual.tipo'
        };
        Object.keys(paramMap).forEach(key => {
            if (params[key]) {
                options[paramMap[key]] = key === 'id' ? Types.ObjectId(params[key]) : params[key];
            }
        });

        if (params.estadoDispensa) {
            const estadoDispensaArray = params.estadoDispensa.split(',');
            options['estadoDispensaActual.tipo'] = { $in: estadoDispensaArray };
        } else {
            options['estadoDispensaActual.tipo'] = 'sin-dispensa';
        }

        if (params.fechaInicio || params.fechaFin) {
            const fechaInicio = params.fechaInicio ? moment(params.fechaInicio).startOf('day').toDate() : moment().subtract(1, 'years').startOf('day').toDate();
            const fechaFin = params.fechaFin ? moment(params.fechaFin).endOf('day').toDate() : moment().endOf('day').toDate();
            options['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
        }
        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }
        const recetasInsumos: any = await RecetaInsumo.find(options);
        return recetasInsumos;
    } catch (err) {
        await informarLog.error('buscarRecetasInsumos', { params, options }, err, req);
        return err;
    }
}

export async function create(req) {
    const pacienteRecetar = req.body.paciente;
    const profRecetar = req.body.profesional;
    const dataRecetaInsumo = {
        insumo: req.body.insumo,
        idPrestacion: req.body.idPrestacion,
        idRegistro: req.body.idRegistro || req.body.idPrestacion,
        fechaRegistro: null,
        fechaPrestacion: null,
        paciente: null,
        profesional: null,
        organizacion: req.body.organizacion,
        diagnostico: null,
        origenExterno: null
    };
    try {
        dataRecetaInsumo.fechaRegistro = dataRecetaInsumo.fechaRegistro ? moment(dataRecetaInsumo.fechaRegistro).toDate() : moment().toDate();
        dataRecetaInsumo.fechaPrestacion = dataRecetaInsumo.fechaPrestacion ? dataRecetaInsumo.fechaPrestacion : dataRecetaInsumo.fechaRegistro;
        const insumoIncompleto = !req.body.insumo || (!req.body.insumo.concepto?.conceptId && !req.body.insumo.generico?.id);
        dataRecetaInsumo.origenExterno = {
            id: req.body.origenExterno?.id || '',
            app: req.user.app?.nombre.toLowerCase() || '',
            fecha: req.body.origenExterno?.fecha ? new Date(req.body.origenExterno.fecha) : dataRecetaInsumo.fechaRegistro,
        };
        if (insumoIncompleto) {
            throw new ParamsIncorrect('Faltan datos del insumo');
        } else {
            const query: any = {
                idRegistro: dataRecetaInsumo.idRegistro
            };
            if (dataRecetaInsumo.insumo.generico) {
                query['insumo.insumo'] = dataRecetaInsumo.insumo.generico.insumo;
            } else {
                query['insumo.concepto.conceptId'] = dataRecetaInsumo.insumo.concepto.conceptId;
            }
            const recetaInsumo = await RecetaInsumo.findOne(query);
            if (recetaInsumo) {
                throw new ParamsIncorrect('Receta de insumo ya registrada');
            }
        }
        if (!req.body.idPrestacion || !dataRecetaInsumo.organizacion) {
            throw new ParamsIncorrect('Faltan datos de la receta de insumo');
        }
        if (!pacienteRecetar || !pacienteRecetar.id) {
            throw new ParamsIncorrect('Faltan datos del paciente');
        } else {
            const pacienteAndes: any = await Paciente.findById(pacienteRecetar.id);
            if (!pacienteAndes) {
                throw new ParamsIncorrect('Paciente no encontrado');
            } else {
                pacienteAndes.obraSocial = (!pacienteRecetar.obraSocial) ? null :
                    {
                        origen: pacienteRecetar.obraSocial.otraOS ? 'RECETAR' : 'PUCO',
                        nombre: pacienteRecetar.obraSocial.nombre,
                        financiador: pacienteRecetar.obraSocial.nombre,
                        codigoPuco: pacienteRecetar.obraSocial.codigoPuco || null,
                        numeroAfiliado: pacienteRecetar.obraSocial.numeroAfiliado || null
                    };
            }
            dataRecetaInsumo.paciente = pacienteAndes;
        }
        if (!profRecetar || !profRecetar.id) {
            throw new ParamsIncorrect('Faltan datos del profesional');
        } else {
            const profAndes = await Profesional.findById(profRecetar.id);
            if (!profAndes) {
                throw new ParamsIncorrect('Profesional no encontrado');
            }
            const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profRecetar.id);
            dataRecetaInsumo.profesional = {
                _id: profAndes._id,
                id: profAndes._id,
                nombre: profAndes.nombre,
                apellido: profAndes.apellido,
                documento: profAndes.documento,
                profesion: profesionGrado,
                especialidad: especialidades,
                matricula: matriculaGrado
            };
        }
        return await crearRecetaInsumo(dataRecetaInsumo, req);
    } catch (err) {
        createLog.error('create', { dataRecetaInsumo, pacienteRecetar, profRecetar }, err, req);
        return err;
    }
}

export async function crearRecetaInsumo(dataRecetaInsumo, req) {
    try {
        const recetaInsumo: any = new RecetaInsumo();
        recetaInsumo.idPrestacion = dataRecetaInsumo.idPrestacion;
        recetaInsumo.idRegistro = dataRecetaInsumo.idRegistro;
        const diag = dataRecetaInsumo.insumo?.diagnostico;
        recetaInsumo.diagnostico = (typeof diag === 'string') ? { descripcion: diag } : diag;
        if (dataRecetaInsumo.insumo.generico) {
            recetaInsumo.insumo = {
                ...dataRecetaInsumo.insumo.generico,
                cantidad: dataRecetaInsumo.insumo.cantidad,
                especificacion: dataRecetaInsumo.insumo.especificacion
            };
        } else {
            recetaInsumo.insumo = dataRecetaInsumo.insumo;
        }
        recetaInsumo.estados = [{ tipo: 'vigente' }];
        recetaInsumo.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
        recetaInsumo.paciente = dataRecetaInsumo.paciente;
        recetaInsumo.paciente.obraSocial = dataRecetaInsumo.paciente.obraSocial;
        recetaInsumo.paciente.id = dataRecetaInsumo.paciente.id || dataRecetaInsumo.paciente._id;
        recetaInsumo.profesional = dataRecetaInsumo.profesional;
        recetaInsumo.profesional._id = dataRecetaInsumo.profesional.id || dataRecetaInsumo.profesional._id;
        recetaInsumo.organizacion = dataRecetaInsumo.organizacion;
        recetaInsumo.fechaRegistro = moment(dataRecetaInsumo.fechaRegistro).toDate();
        recetaInsumo.fechaPrestacion = moment(dataRecetaInsumo.fechaPrestacion).toDate();
        if (dataRecetaInsumo.origenExterno) {
            recetaInsumo.origenExterno = dataRecetaInsumo.origenExterno;
        }
        if (req.user) {
            Auth.audit(recetaInsumo, req as any);
        } else {
            recetaInsumo.audit(req);
        }
        await recetaInsumo.save();
        return recetaInsumo;
    } catch (err) {
        createLog.error('crearRecetaInsumo', { dataRecetaInsumo }, err, req);
        return err;
    }
}

export async function buscarRecetasInsumosPorProfesional(req) {
    try {
        const profesionalId = req.params.id;
        const { estadoReceta, desde, hasta, origenExternoApp, excluirEstado } = req.query;
        if (!profesionalId || !Types.ObjectId.isValid(profesionalId)) {
            throw new ParamsIncorrect();
        }
        const filter: any = {
            'profesional.id': Types.ObjectId(profesionalId)
        };
        if (estadoReceta) {
            filter['estadoActual.tipo'] = estadoReceta;
        }
        if (desde || hasta) {
            filter['fechaRegistro'] = {};
            if (desde) {
                filter['fechaRegistro'].$gte = moment(desde).startOf('day').toDate();
            }
            if (hasta) {
                filter['fechaRegistro'].$lte = moment(hasta).endOf('day').toDate();
            }
        }
        if (origenExternoApp) {
            filter['origenExterno.app'] = origenExternoApp;
        }
        if (excluirEstado) {
            filter['estadoActual.tipo'] = { $ne: excluirEstado };
        }
        const recetasInsumos = await RecetaInsumo.find(filter);
        return recetasInsumos;
    } catch (err) {
        await informarLog.error('buscarRecetasInsumosPorProfesional', { params: req.params, query: req.query }, err);
        return err;
    }
}

export async function suspender(recetaInsumoId, req) {
    const motivo = req.body.motivo;
    const observacion = req.body.observacion;
    const profesional = req.body.profesional;
    try {
        const recetaInsumo: any = await RecetaInsumo.findById(recetaInsumoId);
        if (!recetaInsumo) {
            throw new RecetaNotFound();
        }
        const recetasASuspender = await RecetaInsumo.find({
            'insumo.concepto.conceptId': recetaInsumo.insumo.concepto.conceptId,
            idRegistro: recetaInsumo.idRegistro
        });
        const promises = recetasASuspender.map(async (receta: any) => {
            if ((receta.estadoActual.tipo === 'vigente') || (receta.estadoDispensaActual.tipo !== 'dispensa-parcial' && receta.estadoActual.tipo === 'pendiente')) {
                receta.estados.push({
                    tipo: 'suspendida',
                    motivo,
                    observacion,
                    profesional,
                    fecha: new Date()
                });
                Auth.audit(receta, req);
                await receta.save();
            }
        });
        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        await updateLog.error('suspender', { motivo, observacion, profesional, recetaInsumoId }, error);
        return error;
    }
}
