import { InformePDF, getAssetsURL } from '../model/informe.class';
import { RecuperoCostoBody } from './recupero-costo-body';
import { RecuperoCostoHeader } from './recupero-costo-header';
import { getTurnoById } from '../../../modules/turnos/controller/turnosController';
import { Auth } from '../../../auth/auth.class';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';

export class RecuperoCosto extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/recupero-costo/formulario.scss')
    ];

    public async process() {

        const dataTurno: any = await getTurnoById(this.req.body.turnoId);
        const organizacionId = Auth.getOrganization(this.req);
        const organizacion: any = await Organizacion.findById(organizacionId).select('nombre codigo');

        const paciente = await Paciente.findById(dataTurno.turno.paciente.id);
        dataTurno.turno.paciente.fechaFallecimiento = paciente.fechaFallecimiento;
          
        this.header = new RecuperoCostoHeader();
        this.body = new RecuperoCostoBody({...dataTurno, organizacion});

        await super.process();
    }
}
