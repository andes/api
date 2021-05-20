import { DerivacionBody } from './derivacion-body';
import { DerivacionHeader } from './derivacion-header';
import { InformePDF, getAssetsURL } from '../model/informe.class';
import { Auth } from '../../../auth/auth.class';

export class Derivacion extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/com/comprobante.scss')
    ];

    public async process() {
        this.header = new DerivacionHeader();

        const { derivacionId, historial } = this.req.body;
        const organizacionId = historial ? Auth.getOrganization(this.req) : null;
        this.body = new DerivacionBody({ derivacionId, historial, organizacionId });
        await super.process();
    }

}
