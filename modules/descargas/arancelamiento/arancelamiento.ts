import { InformePDF, getAssetsURL } from '../model/informe.class';
import { ArancelamientoBody } from './arancelamiento-body';
import { getConfiguracion } from '../../../core/tm/controller/organizacion';
import { Auth } from '../../../auth/auth.class';
import { getConfigFacturacionAutomatica } from '../../../modules/facturacionAutomatica/controller/facturacionAutomaticaController';
import { ArancelamientosHeader } from './arancelamiento-header';
import { ArancelamientoFooter } from './arancelamiento-footer';
import { InformeRupFirma } from '../informe-rup/informe-firma';
import { getTurnoById } from '../../../modules/turnos/controller/turnosController';
import { arancelamientoLog } from './arancelamiento.log';
const logArancelamiento = arancelamientoLog.startTrace();

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
        const organizacionNombre = Auth.getOrganization(this.req, 'nombre');
        const dataBody = {
            organizacionId,
            turno: dataTurno.turno,
            organizacionNombre,
            config: await getConfiguracion(organizacionId),
            profesional: dataTurno.agenda.profesionales[0],
            firmaHTML: await this.getFirmaHTML(dataTurno.agenda.profesionales[0], dataTurno.agenda.organizacion),
            resultadoFA: (await getConfigFacturacionAutomatica({ idPrestacionTurneable: dataTurno.turno.tipoPrestacion.conceptId }))[0]
        };
        this.header = new ArancelamientosHeader({ organizacion: dataTurno.agenda.organizacion });
        this.body = new ArancelamientoBody(dataBody);
        this.footer = new ArancelamientoFooter();
        const usuario = this.req.user.usuario;
        const dataLog = {
            organizacion: { id: organizacionId, nombre: organizacionNombre },
            turno: dataTurno.turno.id,
            profesional: dataBody.profesional,
            usuario: this.req.user.usuario
        };
        try {
            await super.process();
            await arancelamientoLog.info('descarga', dataLog, usuario);
        } catch (err) {
            await arancelamientoLog.error('error-descarga', dataLog, err, usuario);
            return err;
        }

    }

    async getFirmaHTML(profesional, organizacion) {
        const firmaHTMLComponent = new InformeRupFirma(profesional, organizacion);
        await firmaHTMLComponent.process();

        return (firmaHTMLComponent.data && firmaHTMLComponent.data.firma) ? await firmaHTMLComponent.render() : null;
    }
}
