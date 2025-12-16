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

        this.header = new InformeRupHeader(prestacionFinal, paciente, organizacion, cama);
        this.body = new InformeRupBody(prestacionFinal, paciente, organizacion, this.registroId);
        this.footer = new InformeRupFooter(prestacionFinal, paciente, organizacion, this.usuario);

        await super.process();

    }


    async getCamaInternacion(data: any) {

        if (data?.solicitud?.ambitoOrigen === 'internacion') {

            const org = data.solicitud.organizacion;
            const fecha = data.ejecucion?.fecha;

            if (!org || !fecha) {
                return null;
            }

            const cama: any = await findByPaciente(
                { organizacion: org, capa: 'medica', ambito: 'internacion' },
                data.paciente.id,
                fecha
            );

            return this.mapCama(cama);
        }

        if (data?.informeIngreso?.fechaIngreso) {

            const org = data.organizacion;
            const fecha = data.informeIngreso.fechaIngreso;

            if (!org || !fecha) {
                return null;
            }

            const cama: any = await findByPaciente(
                { organizacion: org, capa: 'medica', ambito: 'internacion' },
                data.paciente.id,
                fecha
            );

            return this.mapCama(cama);
        }

        return null;
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
            // Mock methods needed by InformeRupBody
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
