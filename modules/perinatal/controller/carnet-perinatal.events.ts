import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { userScheduler } from '../../../config.private';
import { CarnetPerinatalCtr } from './../carnet-perinatal.routes';
import { CarnetPerinatal } from './../schemas/carnet-perinatal.schema';
import { Prestacion } from '../../rup/schemas/prestacion';
import moment = require('moment');

// Al validar la prestacion de "control embarazo", inserta el nuevo control por embarazo
EventCore.on('perinatal:control:validacion', async ({ prestacion, registro }) => {
    if (registro && registro.valor) {

        const carnetYdatos = await obtenerCarnetYdatos(registro, prestacion);
        const carnetExistente = carnetYdatos.carnet;
        const embarazo = carnetYdatos.embarazo;
        const primeriza = carnetYdatos.primeriza;
        const fechaProximoControl = proximoCtrol(prestacion);
        const datos = cargarDatos(prestacion);
        if (carnetExistente) {
            if (!carnetExistente.controles) {
                carnetExistente.controles = [];
            }
            if (moment(carnetExistente.fecha).isAfter(moment(prestacion.ejecucion.fecha).startOf('day').toDate())) {
                carnetExistente.fecha = moment(prestacion.ejecucion.fecha).startOf('day').toDate();
            } else {
                if (datos.fechaUltimaMenstruacion) {
                    carnetExistente.fechaUltimaMenstruacion = moment(datos.fechaUltimaMenstruacion.valor).startOf('day').toDate();
                }
                if (datos.pesoPrevio) {
                    carnetExistente.pesoPrevio = datos.pesoPrevio.valor;
                }
                if (datos.talla) {
                    carnetExistente.talla = datos.talla.valor;
                }
                if (datos.fechaProbableDeParto) {
                    carnetExistente.fechaProbableDeParto = moment(datos.fechaProbableDeParto.valor).startOf('day').toDate();
                }
            }
            const indexControl = carnetExistente.controles.findIndex(item => String(item.idPrestacion) === String(prestacion.id));
            if (indexControl < 0) {
                carnetExistente.controles.push({
                    fechaControl: moment(prestacion.ejecucion.fecha).startOf('day').toDate(),
                    idPrestacion: prestacion.id,
                    organizacion: prestacion.ejecucion.organizacion,
                    profesional: prestacion.solicitud.profesional
                });
            }
            carnetExistente.controles = carnetExistente.controles.sort((a, b) => {
                return new Date(a.fechaControl).getTime() - new Date(b.fechaControl).getTime();
            });
            if (carnetExistente.fechaProximoControl < fechaProximoControl) {
                carnetExistente.fechaProximoControl = fechaProximoControl;
            }
            carnetExistente.fechaUltimoControl = carnetExistente.controles[carnetExistente.controles.length - 1].fechaControl;
            await CarnetPerinatalCtr.update(carnetExistente.id, carnetExistente, userScheduler as any);

        } else {
            const carnet: any = {
                fecha: moment(prestacion.ejecucion.fecha).startOf('day').toDate(),
                paciente: prestacion.paciente,
                controles: [
                    {
                        fechaControl: prestacion.ejecucion.fecha,
                        idPrestacion: prestacion.id,
                        organizacion: prestacion.ejecucion.organizacion,
                        profesional: prestacion.solicitud.profesional
                    }],
                fechaUltimoControl: moment(prestacion.ejecucion.fecha).startOf('day').toDate(),
                fechaProximoControl,
                embarazo,
            };
            const registros = prestacion.ejecucion.registros.find(reg => reg.concepto.conceptId === '364323006');
            if (registros) {
                carnet['cantidadEmbarazos'] = registros.valor;
            }
            carnet.primeriza = primeriza;
            if (datos.fechaUltimaMenstruacion) {
                carnet.fechaUltimaMenstruacion = moment(datos.fechaUltimaMenstruacion.valor).startOf('day').toDate();
            }
            if (datos.pesoPrevio) {
                carnet.pesoPrevio = datos.pesoPrevio.valor;
            }
            if (datos.talla) {
                carnet.talla = datos.talla.valor;
            }
            if (datos.fechaProbableDeParto) {
                carnet.fechaProbableDeParto = moment(datos.fechaProbableDeParto.valor).startOf('day').toDate();
            }
            await CarnetPerinatalCtr.create(carnet, userScheduler as any);
        }
    }
});

EventCore.on('perinatal:control:cancelar-validacion', async ({ prestacion, registro }) => {
    if (registro) {
        const carnetYdatos = await obtenerCarnetYdatos(registro, prestacion);
        const carnetExistente = carnetYdatos.carnet;

        if (carnetExistente) {
            const fechaPrimerControl = carnetExistente.controles[0].fechaControl;
            const idUltimaPrestacion = carnetExistente.controles[carnetExistente.controles.length - 1].idPrestacion;
            carnetExistente.controles = carnetExistente.controles.filter(item => String(item.idPrestacion) !== String(prestacion.id));
            if (carnetExistente.controles.length) {
                // array de controles se generó ordenado por fecha de control
                const ultControl = carnetExistente.controles[carnetExistente.controles.length - 1];
                if (moment(fechaPrimerControl).isSameOrBefore(moment(carnetExistente.fecha).startOf('day').toDate())) {
                    carnetExistente.fecha = moment(carnetExistente.controles[0].fechaControl).startOf('day').toDate();
                }
                carnetExistente.fechaUltimoControl = ultControl.fechaControl;
                if (idUltimaPrestacion.toString() === prestacion.id) {
                    const ultPrestacion: any = await Prestacion.findById(ultControl.idPrestacion);
                    const datos = cargarDatos(ultPrestacion);
                    carnetExistente.fechaProximoControl = ultPrestacion ? proximoCtrol(ultPrestacion) : null;
                    const proxControl = proximoCtrol(prestacion);
                    if (!carnetExistente.fechaProximoControl || carnetExistente.fechaProximoControl <= proxControl) {
                        carnetExistente.fechaProximoControl = ultPrestacion ? proximoCtrol(ultPrestacion) : null;
                    }
                    if (datos.fechaUltimaMenstruacion) {
                        carnetExistente.fechaUltimaMenstruacion = datos.fechaUltimaMenstruacion.valor;
                    }
                    if (datos.pesoPrevio) {
                        carnetExistente.pesoPrevio = datos.pesoPrevio.valor;
                    }
                    if (datos.talla) {
                        carnetExistente.talla = datos.talla.valor;
                    }
                    if (datos.fechaProbableDeParto) {
                        carnetExistente.fechaProbableDeParto = datos.fechaProbableDeParto.valor;
                    }
                }
                await CarnetPerinatalCtr.update(carnetExistente.id, carnetExistente, userScheduler as any);
            } else {
                await CarnetPerinatalCtr.remove(carnetExistente.id);
            }
        }
    }
});

export const proximoCtrol = (prestacion) => {
    const proxControl = prestacion.ejecucion.registros.find(reg => reg.concepto.conceptId === '2471000246107')?.valor;
    return proxControl ? moment(proxControl).startOf('day').toDate() : null;
};

export const cargarDatos = (prestacion) => {
    const registros = prestacion.getRegistros(true);
    const datos = {
        fechaUltimaMenstruacion : registros.find(itemRegistro => itemRegistro.concepto.conceptId === '21840007'),
        pesoPrevio : registros.find(itemRegistro => itemRegistro.concepto.conceptId === '248351003'),
        talla : registros.find(itemRegistro => itemRegistro.concepto.conceptId === '14456009'),
        fechaProbableDeParto : registros.find(itemRegistro => itemRegistro.concepto.conceptId === '161714006'),
    };
    return datos;
};

export const obtenerCarnetYdatos = async (registro, prestacion) => {
    const embarazo = registro.valor;
    let primeriza;
    if (embarazo.conceptId === '199719009'
            || embarazo.conceptId === '127364007'
            || embarazo.conceptId === '29399001'
            || embarazo.conceptId === '53881005') {
        primeriza = true;
    }
    const query = {
        'paciente.id': new Types.ObjectId(prestacion.paciente.id)
    };
    if (primeriza) {
        query['primeriza'] = primeriza;
    } else {
        if (embarazo.conceptId === '127374005') {
            const registros = prestacion.ejecucion.registros.find(reg => reg.concepto.conceptId === '364323006');
            query['cantidadEmbarazos'] = { $eq: registros.valor };
        }
        query['embarazo.conceptId'] = embarazo.conceptId;
    }
    const carnet: any = await CarnetPerinatal.findOne(query);
    const datos = {
        embarazo,
        primeriza,
        carnet
    };
    return datos;
};
