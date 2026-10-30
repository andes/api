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

        const ids = (Array.isArray(this.req.body.agendaIds) && this.req.body.agendaIds.length
            ? this.req.body.agendaIds
            : [this.req.body.agendaId]).filter(id => !!id);

        const dataAgendas = (await Promise.all(ids.map(id => getAgendaById(id)))).filter(agenda => !!agenda);
        const agendas = dataAgendas.map((dataAgenda: any) => ({
            horaInicio: dataAgenda.horaInicio,
            horaFin: dataAgenda.horaFin,
            prestaciones: dataAgenda.tipoPrestaciones,
            profesionales: dataAgenda.profesionales,
            bloques: dataAgenda.bloques,
            organizacion: dataAgenda.organizacion,
            sobreturnos: dataAgenda.sobreturnos
        }));

        this.header = new AgendaHeader();
        this.body = new AgendaBody({ agendas });
        await super.process();

    }
}
