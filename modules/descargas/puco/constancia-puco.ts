import { InformePDF, getAssetsURL } from '../model/informe.class';
import { ConstanciaPucoBody } from './constancia-puco-body';
import { ConstanciaPucoHeader } from './constancia-puco-header';

export class ConstanciaPuco extends InformePDF {
    constructor(public req) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/puco/constancia.scss')
    ];

    public async process() {
        this.header = new ConstanciaPucoHeader(this.req.body.financiador);
        this.body = new ConstanciaPucoBody(this.req.body);

        await super.process();
    }
}
