import { InformePDF, getAssetsURL } from '../model/informe.class';
import { ArancelamientoBody } from './arancelamiento-body';
import { getConfiguracion } from '../../../core/tm/controller/organizacion';
import { Auth } from '../../../auth/auth.class';
import { getConfigFacturacionAutomatica } from '../../../modules/facturacionAutomatica/controller/facturacionAutomaticaController';
import { ArancelamientosHeader } from './arancelamiento-header';
import { ArancelamientoFooter } from './arancelamiento-footer';
import { InformeRupFirma } from '../informe-rup/informe-firma';
import { getTurnoById } from '../../../modules/turnos/controller/turnosController';

export class Arancelamiento extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/arancelamiento/arancelamiento.scss')
    ];

    public async process() {

        const dataTurno: any = await getTurnoById(this.req.body.turnoId);
        const organizacionId = Auth.getOrganization(this.req);
        const dataBody = {
            organizacionId,
            turno: dataTurno.turno,
            organizacionNombre: Auth.getOrganization(this.req, 'nombre'),
            config: await getConfiguracion(organizacionId),
            firmaHTML: await this.getFirmaHTML(dataTurno.agenda.profesionales[0], dataTurno.agenda.organizacion),
            resultadoFA: (await getConfigFacturacionAutomatica({ idPrestacionTurneable: dataTurno.turno.tipoPrestacion.conceptId }))[0]
        };
        this.header = new ArancelamientosHeader({ organizacion: dataTurno.agenda.organizacion});
        this.body = new ArancelamientoBody(dataBody);
        this.footer = new ArancelamientoFooter();

        await super.process();

    }

    async getFirmaHTML(profesional, organizacion) {
        const firmaHTMLComponent = new InformeRupFirma(profesional, organizacion);
        await firmaHTMLComponent.process();

        return (firmaHTMLComponent.data && firmaHTMLComponent.data.firma) ? await firmaHTMLComponent.render() : null;
    }
}
