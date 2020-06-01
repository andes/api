import * as moment from 'moment';
import { HTMLComponent } from '../../model/html-component.class';
import { registroToHTML } from '../utils/registro-to-html';

export class InformeEpicrisisComponent extends HTMLComponent {
    template = `
        <div class="col-3">
            <div class="contenedor-bloque-texto">
                <h6 class="bolder">
                    Servicio
                </h6>
                <h6>
                    {{ valor.unidadOrganizativa }}
                </h6>
            </div>
            <div class="contenedor-bloque-texto">
                <h6 class="bolder">
                    Fecha Ingreso
                </h6>
                <h6>
                    {{ valor.fechaDesde }}
                </h6>
            </div>
            <div class="contenedor-bloque-texto">
                <h6 class="bolder">
                    Fecha Egreso
                </h6>
                <h6>
                    {{ valor.fechaHasta }}
                </h6>
            </div>
        </div>
        </br>
        <div>
            {{#each registros}}
                {{{this}}}
            {{/each}}
        </div>

    `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const ps = this.registro.registros.map(registro => {
            if (this.isEmpty(registro)) {
                return '';
            }
            return registroToHTML(this.prestacion, registro, 0);
        });
        const registros = await Promise.all(ps);

        this.data = {
            registro: this.registro,
            registros,
            showTitle: this.depth === 0,
            valor: {
                unidadOrganizativa: this.registro.valor.unidadOrganizativa?.term,
                fechaDesde: this.format(this.registro.valor.fechaDesde),
                fechaHasta: this.format(this.registro.valor.fechaHasta),
            }
        };
    }

    isEmpty(registro) {
        const hasValue = !!registro.valor;
        const hasChilds = registro.registros.length > 0;
        const emptyChilds = (registro.registros as any[]).every(r => this.isEmpty(r));

        return !hasValue && emptyChilds;
    }

    format(date) {
        return date && moment(date).format('DD/MM/YYYY');
    }

}
