import { InformePDF, getAssetsURL } from '../model/informe.class';
import { FichaEpidemiologicaBody } from './ficha-body';
import { FichaEpidemiologicaFooter } from './ficha-footer';
import { FichaEpidemiologicaHeader } from './ficha-header';

export class FichaEpidemiologica extends InformePDF {
    constructor(private detalle, private usuario, private ficha) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/ficha-epidemiologica/ficha-epidemiologica.scss')
    ];

    public async process() {
        this.header = new FichaEpidemiologicaHeader(this.detalle);
        this.body = new FichaEpidemiologicaBody(this.detalle, this.ficha);
        this.footer = new FichaEpidemiologicaFooter(this.usuario);

        await super.process();
    }

}
