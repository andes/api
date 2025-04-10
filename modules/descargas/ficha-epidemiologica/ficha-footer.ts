import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FichaEpidemiologicaFooter extends HTMLComponent {
    template = `
    <hr>
    <div class="foot"> <b>Fecha y hora de impresión: </b>{{fecha}} </div>
    <div class="foot"> <b>Impreso por: </b>{{usuario}} </div>
    `;

    constructor(public usuario) {
        super();
        this.data = {
            fecha: moment().format('DD/MM/YYYY HH:mm:ss'),
            usuario
        };
    }

}
