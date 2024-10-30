import { InformePDF, getAssetsURL } from '../model/informe.class';
import { FarmaciaBody } from './laboratorio-body';
import { FarmaciaHeader } from './laboratorio-header';
import { LaboratorioFooter } from './laboratorio-footer';

export class Laboratorio extends InformePDF {
    constructor(private encabezado, private detalle, private paciente, private usuario) {
        super();
    }

    stylesUrl = [
        getAssetsURL('templates/laboratorio/laboratorio.scss')
    ];

    public async process() {
        this.header = new FarmaciaHeader(this.encabezado);
        this.body = new FarmaciaBody(this.encabezado, this.paciente, this.detalle);
        this.footer = new LaboratorioFooter(this.usuario);

        await super.process();
    }
}
