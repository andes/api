import { Types } from 'mongoose';
import { Paciente } from '../../../core-v2/mpi/paciente';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
import { getObraSocial } from '../../../modules/obraSocial/controller/obraSocial';
import { Consentimiento, PadronElectoral } from '../schemas/consentimiento';

async function validarPaciente(pacienteId: any, documento: any, sexo: any) {
    try {
        if (!pacienteId && (!documento || !sexo)) {
            return { status: 400, message: { mensaje: 'pacienteId o documento y sexo son requeridos' } };
        }
        let paciente: any;
        if (pacienteId) {
            if (!Types.ObjectId.isValid(pacienteId)) {
                return { status: 400, message: { mensaje: 'pacienteId inválido' } };
            }
            paciente = await Paciente.findById(pacienteId);
        } else {
            paciente = await Paciente.findOne({ documento, sexo, activo: true });
        }
        if (paciente) {
            if (paciente.fechaFallecimiento && paciente.fechaFallecimiento !== null) {
                return { status: 200, message: { validado: false, mensaje: 'Paciente fallecido', Fecha: paciente.fechaFallecimiento } };
            }
            const edadPaciente = calcularEdad(paciente.fechaNacimiento, paciente.fechaFallecimiento);
            if (edadPaciente && edadPaciente >= 65) {
                const financiador = verificarFinanciador(paciente.financiador) ? paciente.financiador : await getObraSocial(paciente);
                if (!financiador) {
                    const matriculaNum = Number(paciente.documento);
                    if (!isNaN(matriculaNum)) {
                        const generoPadron = paciente.sexo === 'masculino' ? 'M' : paciente.sexo === 'femenino' ? 'F' : 'X';
                        const existePadron = await PadronElectoral.findOne({ matricula: matriculaNum, genero: generoPadron });
                        if (existePadron) {
                            return { status: 200, message: { validado: true, mensaje: 'Paciente validado correctamente' } };
                        }
                    }
                }
            }
            return { status: 200, message: { validado: false, mensaje: 'Paciente no validado' } };
        }
        return { status: 404, message: { mensaje: 'Paciente no encontrado' } };
    } catch (error) {
        return { status: 500, message: { mensaje: 'Error al validar paciente' } };
    }
}

function verificarFinanciador(financiador: any) {
    return !financiador || financiador.length === 0 || (financiador.length === 1 && financiador[0].nombre === 'SUMAR');
}

async function guardarConsentimiento(programa: string, version: number, pacienteId: any, aceptacion: boolean) {
    try {
        if (!programa || version === undefined || !pacienteId || aceptacion === undefined) {
            throw { status: 400, message: 'Faltan parámetros requeridos (programa, version, pacienteId, aceptacion)' };
        }
        if (!Types.ObjectId.isValid(pacienteId)) {
            throw { status: 400, message: 'pacienteId inválido' };
        }
        const consentimiento: any = await Consentimiento.findOne({ programa, version, pacienteId });
        if (consentimiento) {
            consentimiento.log.push({ aceptacion: consentimiento.aceptacion, fechaResp: consentimiento.fechaResp });
            consentimiento.aceptacion = aceptacion;
            consentimiento.fechaResp = new Date();
            await consentimiento.save();
            return borrarLogConsentimientos(consentimiento.toObject());
        } else {
            const nuevoConsentimiento: any = new Consentimiento({
                programa,
                version,
                pacienteId,
                aceptacion,
                fechaResp: new Date(),
            });
            await nuevoConsentimiento.save();
            return borrarLogConsentimientos(nuevoConsentimiento.toObject());
        }
    } catch (error: any) {
        if (error.status) {
            throw error;
        }
        throw new Error('Error al guardar el consentimiento');
    }
}

function borrarLogConsentimientos(data: any) {
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                delete item.log;
            }
        });
    } else if (data && typeof data === 'object') {
        delete data.log;
    }
    return data;
}

export { validarPaciente, guardarConsentimiento, borrarLogConsentimientos };
