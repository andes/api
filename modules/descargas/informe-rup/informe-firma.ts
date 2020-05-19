import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { makeFsFirma } from '../../../core/tm/schemas/firmaProf';
import { streamToBase64 } from '../../rup/controllers/rupStore';

export class InformeRupFirma extends HTMLComponent {
    template = `
        <footer id="last">
        <!-- Firmas -->
        <span class="contenedor-firmas">
            <div class="contenedor-bloque-texto">
                {{#if firma}}
                    <img src="data:image/png;base64,{{{firma}}}">
                {{/if}}
                <hr class="lg">
                <h6 class="bolder">
                    {{ detalle }} <br>
                    {{ detalle2 }}
                </h6>
                <h6 class="subdata-italic"> </h6>
                <h6 class="subdata-fecha">
                    {{ fechaActual }}
                </h6>
            </div>
        </span>
    </footer>
    `;

    constructor(public prestacion) {
        super();

    }

    async process() {
        const imagenFirma = await this.getFirma(this.prestacion.solicitud.profesional);

        const detalle = this.prestacion.solicitud.profesional.apellido + ', ' + this.prestacion.solicitud.profesional.nombre;
        const detalle2 = this.prestacion.solicitud.organizacion.nombre.substring(0, this.prestacion.solicitud.organizacion.nombre.indexOf('-'));


        this.data = {
            firma: imagenFirma,
            detalle,
            detalle2,
            fechaActual: moment().format('DD/MM/YYYY HH:mm') + ' hs'
        };
    }

    private async getFirma(profesional) {
        const FirmaSchema = makeFsFirma();
        const file = await FirmaSchema.findOne({ 'metadata.idProfesional': String(profesional.id) }, {}, { sort: { _id: -1 } });
        if (file) {
            const stream = FirmaSchema.readById(file.id);
            const base64 = await streamToBase64(stream);
            return base64;
        }
        return null;
    }
}
