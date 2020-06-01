import { Types } from 'mongoose';
import { InformePDF, getAssetsURL } from '../model/informe.class';
import { model as Prestacion } from '../../rup/schemas/prestacion';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { InformeRupHeader } from './informe-header';
import { InformeRupBody } from './informe-body';
import { InformeRupFooter } from './informe-footer';
import { elementosRUPAsSet, fulfillPrestacion } from '../../rup/controllers/elementos-rup.controller';

export class InformeRUP extends InformePDF {

    constructor(private prestacionId: string | Types.ObjectId, private registroId: string | Types.ObjectId = null, private usuario: any) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const prestacion: any = await Prestacion.findById(this.prestacionId);
        const { paciente } = await buscarPaciente(prestacion.paciente.id);
        const organizacion = await Organizacion.findById(prestacion.ejecucion.organizacion.id);
        const elementosRUPSet = await elementosRUPAsSet();

        fulfillPrestacion(prestacion, elementosRUPSet);

        this.header = new InformeRupHeader(prestacion, paciente, organizacion);
        this.body = new InformeRupBody(prestacion, paciente, organizacion, this.registroId);
        this.footer = new InformeRupFooter(prestacion, paciente, organizacion, this.usuario);

        // Obligatorio por ahora llamar al proccess de la clase abstracta
        await super.process();
    }

}
