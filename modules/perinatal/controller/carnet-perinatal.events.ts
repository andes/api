import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { userScheduler } from '../../../config.private';
import { CarnetPerinatalCtr } from './../carnet-perinatal.routes';
import { CarnetPerinatal } from './../schemas/carnet-perinatal.schema';
import moment = require('moment');

// Al validar la prestacion de vacunacion, inserta la fecha de vacunacion en la inscripcion
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
        if (carnetExistente) {
            if (!carnetExistente.controles) {
                carnetExistente.controles = [];
            }
            let fechaProximoControl = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '390840006');
            let indexControl = carnetExistente.controles.findIndex(item => String(item.idPrestacion) === String(prestacion.id));
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
            carnetExistente.fechaProximoControl = moment(fechaProximoControl.valor).startOf('day').toDate();
            carnetExistente.fechaUltimoControl = carnetExistente.controles[carnetExistente.controles.length - 1].fechaControl;
            await CarnetPerinatalCtr.update(carnetExistente.id, carnetExistente, userScheduler as any);
        } else {
            let fechaUltimaMenstruacion = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '21840007');
            let pesoPrevio = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '248351003');
            let talla = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '14456009');
            let fechaProbableDeParto = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '161714006');
            let fechaProximoControl = prestacion.ejecucion.registros.find(itemRegistro => itemRegistro.concepto.conceptId === '390840006');
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
                fechaProximoControl: moment(fechaProximoControl.valor).startOf('day').toDate(),
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
            carnetExistente.controles = carnetExistente.controles.filter(item => String(item.idPrestacion) !== String(prestacion.id));
            if (carnetExistente.controles.length) {
                carnetExistente.fechaUltimoControl = carnetExistente.controles[carnetExistente.controles.length - 1].fechaControl;
            }
            await CarnetPerinatalCtr.update(carnetExistente.id, carnetExistente, userScheduler as any);
        }
    }
});

