import { InformePDF, getAssetsURL } from '../model/informe.class';
import { AgendaHeader } from './agenda-header';
import { AgendaBody } from './agenda-body';
import { getAgendaById } from '../../../modules/turnos/controller/agenda';

export class Agenda extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/agenda/agenda.scss')
    ];

    public async process() {

        const dataAgenda: any = await getAgendaById(this.req.body.agendaId);
        const dataBody = {
            horaInicio: dataAgenda.horaInicio,
            horaFin: dataAgenda.horaFin,
            prestaciones: dataAgenda.tipoPrestaciones,
            profesionales: dataAgenda.profesionales,
            bloques: dataAgenda.bloques,
            organizacion: dataAgenda.organizacion,
            sobreturnos: dataAgenda.sobreturnos
        };
        this.header = new AgendaHeader();
        this.body = new AgendaBody({ dataBody });
        await super.process();

    }
}
