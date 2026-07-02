import { Paciente } from '../../../core-v2/mpi/paciente';
import { calcularEdad } from '../../../core-v2/mpi/paciente/paciente.schema';
import { getObraSocial } from '../../../modules/obraSocial/controller/obraSocial';
import { Consentimiento, PadronElectoral } from '../schemas/consentimiento';

async function validarPaciente(pacienteId: any, documento: any, sexo: any) {
    try {
        if (!pacienteId && (!documento || !sexo)) {
            return { status: 200, message: { mensaje: 'pacienteId o documento y sexo son requeridos' } };
        }
        let paciente: any;
        if (pacienteId) {
            paciente = await Paciente.findById(pacienteId);
        } else {
            paciente = await Paciente.findOne({ documento, sexo, activo: true });
        }
        if (paciente) {
            const edadPaciente = calcularEdad(paciente.fechaNacimiento, paciente.fechaFallecimiento);
            if (edadPaciente && edadPaciente >= 65) {
                let financiador = paciente.financiador;
                let sinFinanciador = false;
                sinFinanciador = verificarFinanciador(financiador);
                if (sinFinanciador) {
                    financiador = await getObraSocial(paciente);
                    sinFinanciador = verificarFinanciador(financiador);
                }
                if (sinFinanciador) {
                    const existePadron = await PadronElectoral.findOne({ matricula: paciente.documento, genero: paciente.sexo === 'masculino' ? 'M' : paciente.sexo === 'femenino' ? 'F' : 'X' });
                    if (existePadron) {
                        return { status: 200, message: { validado: true, mensaje: 'Paciente validado correctamente' } };
                    }
                }
            }
            return { status: 200, message: { validado: false, mensaje: 'Paciente no validado' } };
        }
        return { status: 200, message: { mensaje: 'Paciente no encontrado' } };
    } catch (error) {
        return { status: 500, message: { mensaje: 'Error al validar paciente' } };
    }
}

function verificarFinanciador(financiador: any) {
    let r = false;
    if (financiador && financiador.length > 0) {
        for (const f of financiador) {
            if (f.codigoPuco === 921001) {
                r = true;
            }
        }
    } else {
        r = true;
    }
    return r;
}

async function guardarConsentimiento(programa: string, version: number, pacienteId: any, aceptacion: boolean) {
    try {
        const consentimiento: any = await Consentimiento.findOne({ programa, version, pacienteId });
        if (consentimiento) {
            consentimiento.log.push({ aceptacion: consentimiento.aceptacion, fechaResp: consentimiento.fechaResp });
            consentimiento.aceptacion = aceptacion;
            consentimiento.fechaResp = new Date();
            await consentimiento.save();
            return borrarLogConsentimientos([consentimiento.toObject()]);
        } else {
            const nuevoConsentimiento: any = new Consentimiento({
                programa,
                version,
                pacienteId,
                aceptacion,
                fechaResp: new Date(),
            });
            await nuevoConsentimiento.save();
            return borrarLogConsentimientos([nuevoConsentimiento.toObject()]);
        }
    } catch (error) {
        throw new Error('Error al guardar el consentimiento');
    }
}

function borrarLogConsentimientos(consentimientos: any[]) {
    consentimientos.forEach(consentimiento => {
        delete consentimiento.log;
    });
    return consentimientos;
}

export { validarPaciente, guardarConsentimiento, borrarLogConsentimientos };
