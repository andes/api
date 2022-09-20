import { InformePDF, getAssetsURL } from '../model/informe.class';
import { TurnosInformeBody } from './turno-body';
import { TurnosInformeHeader } from './turnos-header';
import * as moment from 'moment';

export class InformeTurnos extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/matriculaciones/informe-turno.scss')
    ];

    public async process() {
        const fecha = moment(this.req.body.fecha).format('DD/MM/YYYY');
        const turnos = this.req.body.turnos;
        this.header = new TurnosInformeHeader();
        this.body = new TurnosInformeBody(turnos,fecha);
        await super.process();
    }
}
