import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class LaboratorioFooter extends HTMLComponent {
    template = `
    <hr>
    <div class="foot"> Fecha y hora de impresión: {{fecha}} </div>
    <div class="foot"> Impreso por: {{usuario}} </div>
    `;

    constructor(public usuario) {
        super();
        this.data = {
            fecha: moment().format('DD/MM/YYYY HH:mm:ss'),
            usuario
        };
    }

}
