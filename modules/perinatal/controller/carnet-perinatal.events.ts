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
            query['embarazo.conceptId'] = embarazo.conceptId;
        }
        const carnetExistente: any = await CarnetPerinatal.findOne(query);

        const fechaProximoControl = proximoCtrol(prestacion);

        const registros = prestacion.getRegistros(true);

        const fechaUltimaMenstruacion = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '21840007');
        const pesoPrevio = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '248351003');
        const talla = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '14456009');
        const fechaProbableDeParto = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '161714006');
        if (carnetExistente) {
            if (!carnetExistente.controles) {
                carnetExistente.controles = [];
            }
            if (moment(carnetExistente.fecha).isAfter(moment(prestacion.ejecucion.fecha).startOf('day').toDate())) {
                carnetExistente.fecha = moment(prestacion.ejecucion.fecha).startOf('day').toDate();
            } else {
                if (fechaUltimaMenstruacion) {
                    carnetExistente.fechaUltimaMenstruacion = moment(fechaUltimaMenstruacion.valor).startOf('day').toDate();
                }
                if (pesoPrevio) {
                    carnetExistente.pesoPrevio = pesoPrevio.valor;
                }
                if (talla) {
                    carnetExistente.talla = talla.valor;
                }
                if (fechaProbableDeParto) {
                    carnetExistente.fechaProbableDeParto = moment(fechaProbableDeParto.valor).startOf('day').toDate();
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
                embarazo
            };
            carnet.primeriza = primeriza;
            if (fechaUltimaMenstruacion) {
                carnet.fechaUltimaMenstruacion = moment(fechaUltimaMenstruacion.valor).startOf('day').toDate();
            }
            if (pesoPrevio) {
                carnet.pesoPrevio = pesoPrevio.valor;
            }
            if (talla) {
                carnet.talla = talla.valor;
            }
            if (fechaProbableDeParto) {
                carnet.fechaProbableDeParto = moment(fechaProbableDeParto.valor).startOf('day').toDate();
            }
            await CarnetPerinatalCtr.create(carnet, userScheduler as any);
        }
    }
});

EventCore.on('perinatal:control:cancelar-validacion', async ({ prestacion, registro }) => {
    if (registro) {
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
            query['embarazo.conceptId'] = embarazo.conceptId;
        }
        const carnetExistente: any = await CarnetPerinatal.findOne(query);
        if (carnetExistente) {
            const idUltimaPrestacion = carnetExistente.controles[carnetExistente.controles.length - 1].idPrestacion;
            carnetExistente.controles = carnetExistente.controles.filter(item => String(item.idPrestacion) !== String(prestacion.id));
            if (carnetExistente.controles.length) {
                // array de controles se generó ordenado por fecha de control
                const ultControl = carnetExistente.controles[carnetExistente.controles.length - 1];
                carnetExistente.fechaUltimoControl = ultControl.fechaControl;
                if (idUltimaPrestacion.toString() === prestacion.id) {
                    const ultPrestacion: any = await Prestacion.findById(ultControl.idPrestacion);
                    const registros = ultPrestacion.getRegistros(true);
                    const fechaUltimaMenstruacion = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '21840007');
                    const pesoPrevio = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '248351003');
                    const talla = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '14456009');
                    const fechaProbableDeParto = registros.find(itemRegistro => itemRegistro.concepto.conceptId === '161714006');
                    carnetExistente.fechaProximoControl = ultPrestacion ? proximoCtrol(ultPrestacion) : null;
                    const proxControl = proximoCtrol(prestacion);
                    if (!carnetExistente.fechaProximoControl || carnetExistente.fechaProximoControl <= proxControl) {
                        carnetExistente.fechaProximoControl = ultPrestacion ? proximoCtrol(ultPrestacion) : null;
                    }
                    if (fechaUltimaMenstruacion) {
                        carnetExistente.fechaUltimaMenstruacion = fechaUltimaMenstruacion.valor;
                    }
                    if (pesoPrevio) {
                        carnetExistente.pesoPrevio = pesoPrevio.valor;
                    }
                    if (talla) {
                        carnetExistente.talla = talla.valor;
                    }
                    if (fechaProbableDeParto) {
                        carnetExistente.fechaProbableDeParto = fechaProbableDeParto.valor;
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
