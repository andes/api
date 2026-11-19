import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';

export class FichaEpidemiologicaFooter extends HTMLComponent {
    template = `
    <hr>
    <span class="foot"> 
        <p><b>Fecha y hora de impresión: </b>{{fecha}}</p>
        <p><b>Impreso por: </b>{{usuario}}</p>
    </span>
    `;

    constructor(public usuario) {
        super();
        this.data = {
            fecha: moment().format('DD/MM/YYYY HH:mm:ss'),
            usuario
        };
    }

}
