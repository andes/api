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

export class InformeRUP extends InformePDF {

    constructor(private prestacionId: string | Types.ObjectId, private registroId: string | Types.ObjectId = null, private usuario: any) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const prestacion: any = await Prestacion.findById(this.prestacionId);
        const paciente = await findById(prestacion.paciente.id);
        const organizacion = await Organizacion.findById(prestacion.ejecucion.organizacion.id);
        const elementosRUPSet = await elementosRUPAsSet();

        fulfillPrestacion(prestacion, elementosRUPSet);

        const cama = await this.getCamaInternacion(prestacion);

        this.header = new InformeRupHeader(prestacion, paciente, organizacion, cama);
        this.body = new InformeRupBody(prestacion, paciente, organizacion, this.registroId);
        this.footer = new InformeRupFooter(prestacion, paciente, organizacion, this.usuario);

        // Obligatorio por ahora para llamar al proccess de la clase abstracta
        await super.process();
    }

    async getCamaInternacion(prestacion) {
        if (prestacion.solicitud.ambitoOrigen === 'internacion') {
            const org = prestacion.solicitud.organizacion;

            const cama: any = await findByPaciente(
                { organizacion: org, capa: 'medica', ambito: 'internacion' },
                prestacion.paciente.id,
                prestacion.ejecucion.fecha
            );
            if (cama) {
                const sectores = cama.sectores || [];
                cama.sectorName = [...sectores].reverse().map(s => s.nombre).join(', ');
                return cama;
            }
        }
        return null;
    }

}
