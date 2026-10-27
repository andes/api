
import * as mongoose from 'mongoose';
import { logPaciente } from './logPaciente';
import turnoSchema = require('../../../modules/turnos/schemas/turno');

// Modelo temporal para probar turnos como documentos Mongoose,
// además de objetos planos. No se necesita conexión a MongoDB.
const TurnoTest = mongoose.model(
    'TurnoLogPacienteRegression',
    turnoSchema
);

describe('logPaciente - validación de dataTurno', () => {

    const casos = [
        {
            nombre: 'ambos campos ausentes',
            campos: {}
        },
        {
            nombre: 'webexLinks en null',
            campos: { webexLinks: null }
        },
        {
            nombre: 'estadoFacturacion en null',
            campos: { estadoFacturacion: null }
        },
        {
            nombre: 'ambos campos en null',
            campos: {
                webexLinks: null,
                estadoFacturacion: null
            }
        },
        {
            nombre: 'ambos campos vacíos',
            campos: {
                webexLinks: {},
                estadoFacturacion: {}
            }
        },
        {
            nombre: 'ambos campos con valores',
            campos: {
                webexLinks: {
                    patientLink: 'https://ejemplo.com/paciente',
                    professionalLink: 'https://ejemplo.com/profesional'
                },
                estadoFacturacion: {
                    tipo: 'manual',
                    estado: 'Facturado'
                }
            }
        },
        {
            nombre: 'webexLinks con valor y facturación null',
            campos: {
                webexLinks: {
                    patientLink: 'https://ejemplo.com/paciente'
                },
                estadoFacturacion: null
            }
        },
        {
            nombre: 'webexLinks null y facturación con valor',
            campos: {
                webexLinks: null,
                estadoFacturacion: {
                    estado: 'Facturado'
                }
            }
        }
    ];

    // Verificamos las dos formas en que el logger puede
    // recibir un turno: documento Mongoose u objeto plano.
    const representaciones = [
        {
            nombre: 'documento Mongoose',
            convertir: (campos: any) => new TurnoTest(campos)
        },
        {
            nombre: 'copia mediante toObject()',
            convertir: (campos: any) =>
                new TurnoTest(campos).toObject()
        }
    ];

    representaciones.forEach(representacion => {
        describe(representacion.nombre, () => {

            casos.forEach(caso => {
                it(`valida correctamente ${caso.nombre}`, async () => {
                    const turno = representacion.convertir({
                        horaInicio: new Date('2026-10-26T12:00:00Z'),
                        estado: 'asignado',
                        ...caso.campos
                    });

                    const log = new logPaciente({
                        paciente: new mongoose.Types.ObjectId(),
                        operacion: 'turnos:dar',
                        dataTurno: {
                            turno,
                            profesionales: [],
                            idAgenda: new mongoose.Types.ObjectId(),
                            idBloque: new mongoose.Types.ObjectId()
                        }
                    });

                    // Usamos validate() porque el error reportado
                    // ocurre durante la validación del documento.
                    await expect(log.validate()).resolves.toBeUndefined();

                    const resultado: any = log.toObject();

                    // El nuevo contenedor no debe generar un _id.
                    expect(resultado.dataTurno._id).toBeUndefined();

                    // Los null explícitos deben conservarse.
                    Object.keys(caso.campos).forEach(campo => {
                        if (caso.campos[campo] === null) {
                            expect(resultado.dataTurno.turno[campo])
                                .toBeNull();
                        }
                    });

                    // La auditoría debe mantener los identificadores.
                    expect(resultado.dataTurno.idAgenda).toBeDefined();
                    expect(resultado.dataTurno.idBloque).toBeDefined();
                });
            });
        });
    });

    it('rechaza un estado de turno inválido', async () => {
        const log = new logPaciente({
            operacion: 'turnos:dar',
            dataTurno: {
                turno: {
                    estado: 'estadoInexistente'
                }
            }
        });

        // La corrección no debe desactivar las validaciones.
        await expect(log.validate()).rejects.toThrow();
    });

    it('rechaza una operación de auditoría inválida', async () => {
        const log = new logPaciente({
            operacion: 'operacionInexistente',
            dataTurno: {
                turno: {
                    estado: 'asignado'
                }
            }
        });

        await expect(log.validate()).rejects.toThrow();
    });
});
