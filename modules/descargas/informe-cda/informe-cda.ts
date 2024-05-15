import { InformePDF, getAssetsURL } from '../model/informe.class';
import { InformeCDAHeader } from './informe-header-cda';
import { InformeCDABody } from './informe-body-cda';
import { InformeCDAFooter } from './informe-footer-cda';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

export class InformeCDA extends InformePDF {
    constructor(public datos, public usuario) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const paciente: any = await Paciente.findById(this.datos.paciente || this.datos.idPaciente);
        const organizacion = await Organizacion.findById(this.datos.organizacion._id);
        this.header = new InformeCDAHeader(organizacion, paciente, this.datos.profesional);
        this.body = new InformeCDABody(this.datos, organizacion, paciente);
        this.footer = new InformeCDAFooter(this.usuario, organizacion);
        await super.process();
    }

}
