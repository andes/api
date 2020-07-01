import * as moment from 'moment';
import { loadImage, InformePDF, getAssetsURL } from '../model/informe.class';
import { CensoBody } from './censo-body';
import { Auth } from '../../../auth/auth.class';
import { CensoMensualBody } from './censo-mensual-body';
import { CensoHeader } from './censo-header';
import { CensoFooter } from './censo-footer';
import { CensoMensualHeader } from './censo-mensual-header';

export class InformeCenso extends InformePDF {
    constructor(public tipoCenso, public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/rup/informes/sass/main.scss')
    ];

    public async process() {
        const usuario = Auth.getUserName(this.req);
        const organizacion = this.req.body.organizacion;
        const unidadOrganizativa = this.req.body.unidad.term;

        if (this.tipoCenso === 'diario') {
            const fechaCenso = moment(this.req.body.fecha).format('DD/MM/YYYY');
            this.header = new CensoHeader(fechaCenso, organizacion, unidadOrganizativa);
            this.body = new CensoBody(this.req.body.listadoCenso, this.req.body.resumenCenso);
            this.footer = new CensoFooter(usuario, organizacion);
        }

        if (this.tipoCenso === 'mensual') {
            this.header = new CensoMensualHeader(organizacion, unidadOrganizativa, this.req.body.fechaDesde, this.req.body.fechaHasta);
            this.body = new CensoMensualBody(this.req.body.listadoCenso, this.req.body.resumenCenso, this.req.body.datosCenso);
            this.footer = new CensoFooter(usuario, organizacion);
        }

        // Obligatorio por ahora llamar al proccess de la clase abstracta
        await super.process();
    }
}
