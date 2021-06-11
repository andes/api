import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { registroToHTML } from './utils/registro-to-html';
import { InformeRupFirma } from './informe-firma';

export class InformeRupBody extends HTMLComponent {
    template = `
        <main>
            <section class="contenedor-informe">
                <article class="cabezal-conceptos horizontal">
                    <div class="contenedor-bloque-texto w-3/4" >
                        <div class="tipo-prestacion">
                            {{ titulo }}
                        </div>
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
                          {{#if esValidada}}
                             <h6 class="bolder">
                             Fecha Validación
                            </h6>
                            <h6>
                                {{ fechaValidacion }}hs
                           </h6>
                        {{else}}
                            <h6 class="bolder">
                            Sin validar
                            </h6>
                        {{/if}}
                    </div>
                </article>
                <hr>
                <div class="registros">
                    {{#each registros}}
                        {{{this}}}
                    {{/each}}
                </div>
                {{#if firmaHTML}}
                    {{{ firmaHTML }}}
                {{/if}}
            </section>
        </main>
    `;

    constructor(public prestacion, public paciente, public organizacion, public registroId) {
        super();
    }

    public async process() {

        const fechaEjecucion = this.getFechaEstado('ejecucion');
        const fechaValidacion = this.getFechaEstado('validada');
        const esValidada = (fechaValidacion !== null);

        if (this.registroId) {
            const registro = this.prestacion.findRegistroById(this.registroId);
            this.prestacion.solicitud.tipoPrestacion = registro.concepto;
            this.prestacion.ejecucion.registros = [registro];
        }

        const ps = this.prestacion.ejecucion.registros
            .filter(r => !(r.privacy && (r.privacy.scope === 'private' || r.privacy.scope === 'termOnly'))) // filtramos los registros privados
            .map((registro) => registroToHTML(this.prestacion, registro, this.registroId ? 1 : 0));

        const registros = await Promise.all(ps);

        const firmaHTML = await this.getFirmaHTML();

        this.data = {

            fechaEjecucion: fechaEjecucion && moment(fechaEjecucion).format('DD/MM/YYYY HH:mm'),
            fechaValidacion: fechaValidacion && moment(fechaValidacion).format('DD/MM/YYYY HH:mm'),
            titulo: this.prestacion.solicitud.tipoPrestacion.term,
            registros,
            esValidada,
            firmaHTML
        };
    }

    async getFirmaHTML() {
        if (this.validada()) {
            const prof = this.prestacion.estadoActual.createdBy;
            const firmaHTMLComponent = new InformeRupFirma(prof, this.prestacion.solicitud.organizacion);
            await firmaHTMLComponent.process();
            return firmaHTMLComponent.render();
        } else {
            return null;
        }
    }

    getFechaEstado(tipo: 'validada' | 'ejecucion') {
        const validada = this.validada();
        switch (tipo) {
            case 'validada':
                if (validada) {
                    return this.prestacion.estados[this.prestacion.estados.length - 1].createdAt;
                }
                return null;
            case 'ejecucion':
                if (validada) {
                    return this.prestacion.estados[this.prestacion.estados.length - 2].createdAt;
                } else {
                    return this.prestacion.estados[this.prestacion.estados.length - 1].createdAt;
                }
        }
    }

    validada() {
        return (this.prestacion.estadoActual.tipo === 'validada');
    }

}
