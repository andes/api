import { Types } from 'mongoose';
import { InformePDF, getAssetsURL } from '../model/informe.class';
import { Prestacion } from '../../rup/schemas/prestacion';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { InformeRupHeader } from './informe-header';
import { InformeRupBody } from './informe-body';
import { InformeRupFooter } from './informe-footer';
import { elementosRUPAsSet, fulfillPrestacion } from '../../rup/controllers/elementos-rup.controller';
import { findByPaciente } from '../../rup/internacion/camas.controller';
import { findById } from '../../../core-v2/mpi/paciente/paciente.controller';
import * as moment from 'moment';
import { InformeEstadistica } from '../../rup/internacion/informe-estadistica.schema';
import { obtenerHistorialInternacion } from '../../rup/internacion/internacion.controller';

export class InformeRUP extends InformePDF {

    constructor(private prestacionId: string | Types.ObjectId, private registroId: string | Types.ObjectId = null, private usuario: any) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {

        let prestacionFinal: any;
        let paciente: any;
        let organizacion: any;
        let cama = null;

        const prestacion = await Prestacion.findById(this.prestacionId) as any;

        if (prestacion) {

            paciente = await findById(prestacion.paciente.id);
            organizacion = await Organizacion.findById(prestacion.ejecucion.organizacion.id);

            const elementosRUPSet = await elementosRUPAsSet();
            await fulfillPrestacion(prestacion, elementosRUPSet);

            cama = await this.getCamaInternacion(prestacion);
            prestacionFinal = prestacion;

        } else {

            const informeEstadistico: any = await InformeEstadistica.findById(this.prestacionId);
            if (!informeEstadistico) {
                throw new Error(`Prestacion not found with id ${this.prestacionId}`);
            }

            paciente = await findById(informeEstadistico.paciente.id);
            organizacion = await Organizacion.findById(informeEstadistico.organizacion.id);

            cama = await this.getCamaInternacion(informeEstadistico);
            prestacionFinal = this.mapInformeToPrestacion(informeEstadistico);

        }

        const idInternacion = prestacionFinal._id || prestacionFinal.id;
        const fechaDesde = prestacionFinal.ejecucion?.fecha || prestacionFinal.informeIngreso?.fechaIngreso;
        const fechaHasta = prestacionFinal.informeEgreso?.fechaEgreso || new Date();

        let movimientos = [];
        if (idInternacion && organizacion) {
            const orgId = organizacion.id || organizacion._id || organizacion;
            // Intentamos obtener movimientos de capa médica
            movimientos = await obtenerHistorialInternacion(
                orgId,
                'medica',
                idInternacion,
                fechaDesde,
                fechaHasta
            );

            if (!movimientos?.length) {
                // Si no hay en médica, probamos en estadística
                movimientos = await obtenerHistorialInternacion(
                    orgId,
                    'estadistica',
                    idInternacion,
                    fechaDesde,
                    fechaHasta
                );
            }

            movimientos = movimientos.map(mov => {
                if (mov.sectores) {
                    mov.sectorName = [...mov.sectores].reverse().map(s => s.nombre).join(', ');
                }
                return mov;
            }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        }

        this.header = new InformeRupHeader(prestacionFinal, paciente, organizacion, cama, movimientos);
        this.body = new InformeRupBody(prestacionFinal, paciente, organizacion, this.registroId);
        (this.body as any).movimientos = movimientos;

        this.footer = new InformeRupFooter(prestacionFinal, paciente, organizacion, this.usuario);

        await super.process();

    }


    async getCamaInternacion(data: any) {
        const org = data.solicitud?.organizacion || data.organizacion;
        const fecha = data.ejecucion?.fecha || data.informeIngreso?.fechaIngreso;

        if (!org || !fecha) {
            return null;
        }

        const orgId = org.id || org._id || org;

        // Intentamos en capa médica primero
        let cama: any = await findByPaciente(
            { organizacion: orgId, capa: 'medica', ambito: 'internacion' },
            data.paciente.id,
            fecha
        );

        if (!cama) {
            // Si no hay en médica, probamos en estadística
            cama = await findByPaciente(
                { organizacion: orgId, capa: 'estadistica', ambito: 'internacion' },
                data.paciente.id,
                fecha
            );
        }

        return this.mapCama(cama);
    }

    private mapCama(cama: any) {
        if (!cama) {
            return null;
        }

        const sectores = cama.sectores || [];
        cama.sectorName = [...sectores]
            .reverse()
            .map(s => s.nombre)
            .join(', ');

        if (cama.unidadOrganizativa && typeof cama.unidadOrganizativa === 'object') {
            cama.unidadOrganizativa = cama.unidadOrganizativa.term || cama.unidadOrganizativa.nombre;
        }

        return cama;
    }

    mapInformeToPrestacion(informe) {
        const registros = [];

        const estados = informe.estados ? [...informe.estados] : [];
        const hasEjecucion = estados.find(e => e.tipo === 'ejecucion');
        if (!hasEjecucion) {
            estados.unshift({
                tipo: 'ejecucion',
                createdAt: informe.createdAt || informe.informeIngreso.fechaIngreso,
                createdBy: informe.estadoActual.createdBy
            });
        }
        return {

            _id: informe._id,
            id: informe.id,
            ejecucion: {
                fecha: informe.informeIngreso.fechaIngreso,
                organizacion: informe.organizacion,
                registros
            },
            inicio: 'internacion',
            solicitud: {
                fecha: informe.informeIngreso.fechaIngreso,
                organizacionOrigen: informe.informeIngreso.origen?.organizacionOrigen || informe.organizacion,
                profesionalOrigen: informe.informeIngreso.profesional,
                profesional: informe.informeIngreso.profesional,
                tipoPrestacion: { term: 'Informe Estadístico' },
                organizacion: informe.organizacion
            },
            estados,
            estadoActual: informe.estadoActual,
            paciente: informe.paciente,
            informeEstadistico: {
                ingreso: {
                    fecha: informe.informeIngreso.fechaIngreso,
                    origen: informe.informeIngreso.origen?.tipo,
                    motivo: informe.informeIngreso.motivo,
                    ocupacion: informe.informeIngreso.ocupacionHabitual?.nombre,
                    situacionLaboral: informe.informeIngreso.situacionLaboral,
                    nivelInstruccion: informe.informeIngreso.nivelInstruccion,
                    asociado: informe.informeIngreso.cobertura?.tipo,
                    obraSocial: informe.informeIngreso.cobertura?.obraSocial
                },
                egreso: informe.informeEgreso ? {
                    fecha: informe.informeEgreso.fechaEgreso,
                    diasEstada: informe.informeEgreso.diasDeEstada,
                    tipoEgreso: informe.informeEgreso.tipoEgreso?.nombre,
                    causaExterna: informe.informeEgreso.causaExterna ? {
                        comoSeProdujo: informe.informeEgreso.causaExterna.comoSeProdujo?.nombre || informe.informeEgreso.causaExterna.comoSeProdujo,
                        producidaPor: informe.informeEgreso.causaExterna.producidaPor?.nombre || informe.informeEgreso.causaExterna.producidaPor,
                        lugar: informe.informeEgreso.causaExterna.lugar?.nombre || informe.informeEgreso.causaExterna.lugar
                    } : null
                } : null
            },
            findRegistroById: () => null
        };
    }

    crearRegistroSeccion(conceptoTerm, registrosHijos) {
        return {
            concepto: { term: conceptoTerm },
            elementoRUPObject: { componente: 'SeccionComponent' },
            registros: registrosHijos,
            valor: null
        };
    }

    crearRegistroValor(conceptoTerm, valor, componente, params = {}) {
        const comp = componente === 'ValorTextoComponent' ? 'ObservacionesComponent' : componente;
        return {
            concepto: { term: conceptoTerm },
            elementoRUPObject: { componente: comp, params },
            valor,
            registros: [],
            params // Para que registroToHTML lo pase
        };
    }

}
