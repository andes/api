import * as moment from 'moment';
import { InformePDF, getAssetsURL } from '../model/informe.class';
import { CensoBody } from './censo-body';
import { CensoMensualBody } from './censo-mensual-body';
import { CensoHeader } from './censo-header';
import { CensoMensualHeader } from './censo-mensual-header';

export class InformeCenso extends InformePDF {
    constructor(public tipoCenso, public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const organizacion = this.req.body.organizacion;
        const unidadOrganizativa = this.req.body.unidad.term;

        if (this.tipoCenso === 'diario') {
            const fechaCenso = moment(this.req.body.fecha).format('DD/MM/YYYY');
            this.header = new CensoHeader(fechaCenso, organizacion, unidadOrganizativa);
            this.body = new CensoBody(this.req.body.listadoCenso, this.req.body.resumenCenso);
        }

        if (this.tipoCenso === 'mensual') {
            this.header = new CensoMensualHeader(organizacion, unidadOrganizativa, this.req.body.fechaDesde, this.req.body.fechaHasta);
            this.body = new CensoMensualBody(this.req.body.listadoCenso, this.req.body.resumenCenso, this.req.body.datosCenso);
        }

        // Obligatorio por ahora llamar al proccess de la clase abstracta
        await super.process();
    }
}
