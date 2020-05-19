import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { registroToHTML } from './utils/registro-to-html';

export class InformeRupBody extends HTMLComponent {
    template = `
        <main>
            <section class="contenedor-informe">
                <article class="cabezal-conceptos horizontal">
                    <div class="contenedor-bloque-texto">
                        <div class="tipo-prestacion">
                            {{ titulo }}
                        </div>
                    </div>
                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Fecha Solicitud
                        </h6>
                        <h6>
                            {{ fechaSolicitud }}hs
                        </h6>
                    </div>
                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Fecha Ejecución
                        </h6>
                        <h6>
                            {{ fechaEjecucion }}hs
                        </h6>
                    </div>
                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Fecha Validación
                        </h6>
                        <h6>
                            {{ fechaValidacion }}hs
                        </h6>
                    </div>
                </article>
                <hr>
                <div class="registros">
                    {{#each registros}}
                        {{{this}}}
                    {{/each}}
                </div>
            </section>
        </main>
    `;

    constructor(public prestacion, public paciente, public organizacion, public registroId) {
        super();
    }

    public async process() {
        const fechaSolicitud = this.prestacion.solicitud.fecha;
        const fechaEjecucion = this.getFechaEstado('ejecucion');
        const fechaValidacion = this.getFechaEstado('ejecucion');

        if (this.registroId) {
            const registro = this.prestacion.findRegistroById(this.registroId);
            this.prestacion.solicitud.tipoPrestacion = registro.concepto;
            this.prestacion.ejecucion.registros = [registro];
        }

        const ps = this.prestacion.ejecucion.registros.map((registro) => {
            return registroToHTML(this.prestacion, registro, this.registroId ? 1 : 0);
        });

        const registros = await Promise.all(ps);

        this.data = {
            fechaSolicitud: moment(fechaSolicitud).format('DD/MM/YYYY HH:mm'),
            fechaEjecucion: fechaEjecucion && moment(fechaEjecucion).format('DD/MM/YYYY HH:mm'),
            fechaValidacion: fechaValidacion && moment(fechaValidacion).format('DD/MM/YYYY HH:mm'),
            titulo: this.prestacion.solicitud.tipoPrestacion.term,
            registros
        };
    }

    getFechaEstado(tipo) {
        const estados = this.prestacion.estados;
        for (let i = estados.length - 1; i >= 0; i--) {
            const estado = estados[i];
            if (estado.tipo === tipo) {
                return estado.createdAt;
            }
        }
        return null;
    }

}
