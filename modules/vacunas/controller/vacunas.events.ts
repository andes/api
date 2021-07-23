import { ObjectId } from '@andes/core';
import { EventCore } from '@andes/event-bus';
import { Types } from 'mongoose';
import { IPacienteDoc } from '../../../core-v2/mpi/paciente/paciente.interface';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
import { AreaProgramaProvincialCtr } from '../../../core/tm/areaProgramaProvincial';
import * as Localidad from '../../../core/tm/schemas/localidad';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { services } from '../../../services';
import { InscripcionVacunasCtr } from '../inscripcion-vacunas.routes';
import { VacunasPacientes } from '../schemas/vacunas-pacientes.schema';
import { exportCovid19 } from './vacunas.controller';
import { sisa } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
import moment = require('moment');

EventCore.on('mobile:patient:login', async (account) => {
    await exportCovid19(null, account.pacientes[0].id);
});

EventCore.on('rup:prestaciones:vacunacion', async (prestacion) => {
    await sincronizarVacunas(prestacion.paciente.id);
    if (prestacion.estadoActual.tipo === 'ejecucion') {
        // Consulta las vacunas del paciente en webservice de sisa
        const requestVacunas = await consultaVacunasCiudadano(prestacion.paciente);
        if (requestVacunas[0] === 200) {
            const vacunaPrestacion = prestacion.ejecucion.registros[0].valor.vacuna;
            // Busca la vacuna según código y dosis
            const registroSelected = requestVacunas[1].aplicacionesVacunasCiudadano?.aplicacionVacunaCiudadano?.find(vac =>
                vac.idSniVacuna === vacunaPrestacion.vacuna.codigo && vac.sniDosisOrden === vacunaPrestacion.dosis.orden);
            if (registroSelected) {
                const establecimiento = await Organizacion.findById(prestacion.ejecucion.organizacion.id);
                // await bajaVacunaNomivac(registroSelected, establecimiento.codigo.sisa);
            }
        }
    }
});

EventCore.on('mpi:pacientes:link', async ({ source, target }) => {
    await sincronizarVacunas(target);
    await sincronizarVacunas(source);
});

EventCore.on('mpi:pacientes:unlink', async ({ source, target }) => {
    await sincronizarVacunas(source);
    await sincronizarVacunas(target);
});

export async function consultaVacunasCiudadano(paciente) {
    const headers = {
        app_id: sisa.consulta.APP_ID,
        app_key: sisa.consulta.APP_KEY
    };
    const data = {
        idTipoDoc: 1,
        nroDoc: paciente.documento,
        sexo: paciente.sexo === 'masculino' ? 'M' : 'F'
    };
    const options = {
        url: sisa.consulta.url,
        headers,
        method: 'POST',
        json: true,
        body: data
    };
    return await handleHttpRequest(options);
}

export async function bajaVacunaNomivac(vacuna: any, establecimiento: String) {
    const headers = {
        app_id: sisa.baja.APP_ID,
        app_key: sisa.baja.APP_KEY
    };
    const data = {
        idTipoDoc: 1,
        fechaAplicacion: moment(vacuna.fechaAplicacion).format('DD-MM-YYYY'),
        idSniAplicacion: vacuna.idSniAplicacion,
        establecimiento,
        vacuna: vacuna.idSniVacuna
    };
    const options = {
        url: sisa.baja.url,
        headers,
        method: 'DELETE',
        json: true,
        body: data
    };
    return await handleHttpRequest(options);
}

export async function sincronizarVacunas(pacienteID: string) {

    const paciente: any = await getPacienteReal(pacienteID);
    if (!paciente) {
        return;
    }

    // Si soy un paciente inactivo, borro la info para no duplicar datos
    if (String(pacienteID) !== String(paciente.id)) {
        await VacunasPacientes.remove({ 'paciente.id': new Types.ObjectId(pacienteID) });
    }

    const inscripcionVacuna = await InscripcionVacunasCtr.findOne({ idPaciente: paciente.id });
    let carnetVacuna: any = await VacunasPacientes.findOne({ 'paciente.id': paciente.id });
    if (!carnetVacuna) {
        carnetVacuna = new VacunasPacientes();
    }

    const vacunasItems = await services.get('paciente-huds-registros').exec({
        paciente: paciente.id,
        expression: '840534001'
    });

    if (!vacunasItems.length) {
        await VacunasPacientes.remove({ 'paciente.id': paciente.id });
        return;
    }

    const direccion: any = paciente.direccion[0] || {};

    const ubicacionPaciente: any = {};
    if (direccion.ubicacion?.localidad?._id) {
        const _localidad: any = await Localidad.findById(direccion.ubicacion?.localidad._id);
        if (_localidad) {
            ubicacionPaciente.localidad = {
                id: _localidad.id,
                nombre: _localidad.nombre
            };
            if (_localidad.zona) {
                ubicacionPaciente.zona = {
                    id: _localidad.zona?._id,
                    nombre: _localidad.zona?.nombre
                };
            }
            const areaPaciente = await AreaProgramaProvincialCtr.findOne({ idLocalidad: _localidad.id });
            if (areaPaciente) {
                ubicacionPaciente.areaPrograma = {
                    id: areaPaciente.id,
                    nombre: areaPaciente.areaPrograma
                };

            }
        }
    }
    paciente.contacto = paciente.contacto || [];
    const celular = paciente.contacto.find(c => c.tipo === 'celular');
    const email = paciente.contacto.find(c => c.tipo === 'email');
    const telefono = paciente.contacto.find(c => c.tipo === 'telefono');

    let vacunas: any[] = await Promise.all(
        vacunasItems.map(async (item) => {
            if (!item.registro.valor.vacuna) {
                return null;
            }
            const vacunaValor = item.registro.valor.vacuna;
            const organizacionID = item.organizacion.id;
            const organizacion = await Organizacion.findById(organizacionID);
            const localidad: any = await Localidad.findById(organizacion.direccion.ubicacion.localidad.id);
            const zona = localidad.zona || {};
            const area = (await AreaProgramaProvincialCtr.findOne({ idLocalidad: localidad.id })) || {};
            const edad = calcularEdad(paciente.fechaNacimiento, vacunaValor.fechaAplicacion);
            const rango = Math.floor(edad / 5) * 5;

            return {
                idPrestacion: item.idPrestacion,
                edad,
                rango: RangoEtario[rango] || 'Mayor de 80 Años',

                fechaAplicacion: vacunaValor.fechaAplicacion,
                vacuna: {
                    id: vacunaValor.vacuna._id,
                    nombre: vacunaValor.vacuna.nombre,
                    codigo: vacunaValor.vacuna.codigo,
                },
                dosis: {
                    orden: vacunaValor.dosis.orden,
                    nombre: vacunaValor.dosis.nombre,
                    codigo: vacunaValor.dosis.codigo,
                },
                esquema: {
                    nombre: vacunaValor.esquema.nombre,
                    codigo: vacunaValor.esquema.codigo,
                },
                condicion: {
                    nombre: vacunaValor.condicion.nombre,
                    codigo: vacunaValor.condicion.codigo,
                },
                lote: vacunaValor.lote,
                organizacion: {
                    id: organizacion.id,
                    nombre: organizacion.nombre,
                    localidad: {
                        id: localidad.id,
                        nombre: localidad.nombre
                    },
                    zona: {
                        id: zona._id,
                        nombre: zona.nombre
                    },
                    areaPrograma: {
                        id: area.id,
                        nombre: area.areaPrograma
                    }
                }

            };
        })
    );

    vacunas = vacunas.filter(i => !!i).sort((a, b) => a.dosis.orden - b.dosis.orden);

    carnetVacuna.paciente = {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        documento: paciente.documento,
        fechaNacimiento: paciente.fechaNacimiento,
        fechaFallecimiento: paciente.fechaFallecimiento,
        estado: paciente.estado,
        sexo: paciente.sexo,
        email: email?.valor,
        telefono: celular?.valor || telefono?.valor,
        ...ubicacionPaciente
    };

    carnetVacuna.aplicaciones = vacunas;
    carnetVacuna.cantDosis = vacunas.length;
    carnetVacuna.inscripto = !!inscripcionVacuna;

    await carnetVacuna.save();

}


async function getPacienteReal(pacienteID: ObjectId) {
    const paciente: IPacienteDoc = await PacienteCtr.findById(new Types.ObjectId(pacienteID));
    if (paciente?.idPacientePrincipal) {
        const pacienteReal: IPacienteDoc = await PacienteCtr.findById(paciente.idPacientePrincipal);
        return pacienteReal;
    }
    return paciente;
}

const RangoEtario = {
    0: '0 a 4 Años',
    5: '5 a 9 Años',
    10: '10 a 14 Años',
    15: '15 a 19 Años',
    20: '20 a 24 Años',
    25: '25 a 29 Años',
    30: '30 a 34 Años',
    35: '35 a 39 Años',

    40: '40 a 44 Años',
    45: '45 a 49 Años',

    50: '50 a 54 Años',
    55: '55 a 59 Años',

    60: '60 a 64 Años',
    65: '65 a 69 Años',

    70: '70 a 74 Años',
    75: '75 a 79 Años',
};
