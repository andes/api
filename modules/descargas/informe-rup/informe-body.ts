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
                            Fecha Consulta
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
                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Inicio de Prestación
                        </h6>
                        <h6>
                            {{ fechaPrestacion }}hs
                        </h6>
                    </div>
                </article>
                <hr>
                <div class="registros">
                    {{#each registros}}
                        {{{this}}}
                    {{/each}}
                </div>

                {{#if informeEstadistico}}
                    <div class="registros">
                        <h4 class="bolder">DATOS DE INGRESO</h4>
                        <div class="contenedor-secundario">
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Fecha Ingreso</h6>
                                <h6>{{ informeEstadistico.ingreso.fecha }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Origen hospitalización</h6>
                                <h6>{{ informeEstadistico.ingreso.origen }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Motivo de ingreso</h6>
                                <h6>{{ informeEstadistico.ingreso.motivo }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Ocupación habitual</h6>
                                <h6>{{ informeEstadistico.ingreso.ocupacion }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Situación laboral</h6>
                                <h6>{{ informeEstadistico.ingreso.situacionLaboral.nombre }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Nivel instrucción</h6>
                                <h6>{{ informeEstadistico.ingreso.nivelInstruccion.nombre }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Obra social</h6>
                                <h6>{{ informeEstadistico.ingreso.obraSocial.nombre }}</h6>
                            </div>
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Asociado</h6>
                                <h6>{{ informeEstadistico.ingreso.asociado }}</h6>
                            </div>
                        </div>

                        {{#if informeEstadistico.egreso}}
                            <h4 class="bolder mt-2">ALTA DEL PACIENTE</h4>
                            <div class="contenedor-secundario">
                                <div class="contenedor-bloque-texto">
                                    <h6 class="bolder">Fecha de egreso</h6>
                                    <h6>{{ informeEstadistico.egreso.fecha }}</h6>
                                </div>
                                <div class="contenedor-bloque-texto">
                                    <h6 class="bolder">Días de estada</h6>
                                    <h6>{{ informeEstadistico.egreso.diasEstada }}</h6>
                                </div>
                                <div class="contenedor-bloque-texto">
                                    <h6 class="bolder">Tipo de egreso</h6>
                                    <h6>{{ informeEstadistico.egreso.tipoEgreso }}</h6>
                                </div>
                            </div>

                            {{#if informeEstadistico.egreso.causaExterna}}
                                <h4 class="bolder mt-2">CAUSA EXTERNA</h4>
                                <div class="contenedor-secundario">
                                    {{#if informeEstadistico.egreso.causaExterna.comoSeProdujo}}
                                        <div class="contenedor-bloque-texto">
                                            <h6 class="bolder">Cómo se produjo</h6>
                                            <h6>{{ informeEstadistico.egreso.causaExterna.comoSeProdujo }}</h6>
                                        </div>
                                    {{/if}}
                                    {{#if informeEstadistico.egreso.causaExterna.producidaPor}}
                                        <div class="contenedor-bloque-texto">
                                            <h6 class="bolder">Producido por</h6>
                                            <h6>{{ informeEstadistico.egreso.causaExterna.producidaPor }}</h6>
                                        </div>
                                    {{/if}}
                                    {{#if informeEstadistico.egreso.causaExterna.lugar}}
                                        <div class="contenedor-bloque-texto">
                                            <h6 class="bolder">Lugar donde ocurrió</h6>
                                            <h6>{{ informeEstadistico.egreso.causaExterna.lugar }}</h6>
                                        </div>
                                    {{/if}}
                                </div>
                            {{/if}}
                        {{/if}}
                    </div>
                {{/if}}

                {{#if movimientos}}
                    <div class="registros">
                        <h4 class="bolder">MOVIMIENTOS DE INTERNACIÓN</h4>
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>
                                        <small class="font-weight-bold">
                                            FECHA
                                        </small>
                                    </th>
                                    <th>
                                        <small class="font-weight-bold">
                                            CAMA
                                        </small>
                                    </th>
                                    <th>
                                        <small class="font-weight-bold">
                                            UNIDAD ORGANIZATIVA
                                        </small>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each movimientos}}
                                    <tr>
                                        <td>
                                            <small>
                                                {{ fecha }}
                                            </small>
                                        </td>
                                        <td>
                                            <small>
                                                {{#if extras.ingreso}}
                                                    INGRESO <br>
                                                {{/if}}
                                                {{#if extras.egreso}}
                                                    EGRESO <br>
                                                {{/if}}
                                                {{#unless idSalaComun}}
                                                    {{ nombre }} <br> ({{ sectorName }})
                                                {{/unless}}
                                            </small>
                                        </td>
                                        <td>
                                            <small>
                                                {{ unidadOrganizativa }}
                                            </small>
                                        </td>
                                    </tr>
                                {{/each}}
                            </tbody>
                        </table>
                    </div>
                {{/if}}
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

        const fechaEjecucion = this.prestacion.ejecucion.fecha;
        const fechaValidacion = this.getFechaEstado('validada');
        const fechaPrestacion = this.prestacion.estados.find(estado => { return estado.tipo === 'ejecucion'; }).createdAt;
        const esValidada = (fechaValidacion !== null);

        if (this.registroId) {
            const registro = this.prestacion.findRegistroById(this.registroId);
            this.prestacion.solicitud.tipoPrestacion = registro.concepto;
            this.prestacion.ejecucion.registros = [registro];
        }

        const ps = this.prestacion.ejecucion.registros
            .filter(r => !(r.privacy && (r.privacy.scope === 'private' || r.privacy.scope === 'termOnly'))) // filtramos los registros privados
            .map(registro => {
                // armamos un nuevo arreglo dejando solamente las secciones que tienen cargada una molécula/átomo
                const arrayRegistros = registro.registros.filter(r => r.valor || r.registros.length);
                registro.registros = arrayRegistros;
                return registroToHTML(this.prestacion, registro, this.registroId ? 1 : 0);
            });

        const registros = await Promise.all(ps);
        const firmaHTML = await this.getFirmaHTML();

        const movimientos = (this as any).movimientos?.map(mov => {
            return {
                ...mov,
                fecha: moment(mov.fecha).format('DD/MM/YYYY HH:mm'),
                unidadOrganizativa: mov.unidadOrganizativa?.term || mov.unidadOrganizativas?.[0]?.term || ''
            };
        });

        const informeEstadistico = this.prestacion.informeEstadistico ? {
            ingreso: {
                ...this.prestacion.informeEstadistico.ingreso,
                fecha: this.prestacion.informeEstadistico.ingreso.fecha && moment(this.prestacion.informeEstadistico.ingreso.fecha).format('DD/MM/YYYY HH:mm'),
                obraSocial: this.prestacion.informeEstadistico.ingreso.obraSocial || 'sin obra social'
            },
            egreso: this.prestacion.informeEstadistico.egreso ? {
                ...this.prestacion.informeEstadistico.egreso,
                fecha: this.prestacion.informeEstadistico.egreso.fecha && moment(this.prestacion.informeEstadistico.egreso.fecha).format('DD/MM/YYYY HH:mm')
            } : null
        } : null;


        this.data = {

            fechaEjecucion: fechaEjecucion && moment(fechaEjecucion).format('DD/MM/YYYY HH:mm'),
            fechaValidacion: fechaValidacion && moment(fechaValidacion).format('DD/MM/YYYY HH:mm'),
            fechaPrestacion: fechaPrestacion && moment(fechaPrestacion).format('DD/MM/YYYY HH:mm'),
            titulo: this.prestacion.solicitud.tipoPrestacion.term,
            registros,
            movimientos,
            informeEstadistico,
            esValidada,
            firmaHTML
        };
    }

    async getFirmaHTML() {
        if (this.validada()) {
            const prof =
                this.prestacion.estadoActual.createdBy ||
                this.prestacion.estadoActual.updatedBy;

            if (!prof) {
                return null;
            }

            const firmaHTMLComponent = new InformeRupFirma(
                prof,
                this.prestacion.solicitud.organizacion
            );

            await firmaHTMLComponent.process();
            return firmaHTMLComponent.profesional
                ? firmaHTMLComponent.render()
                : null;
        }
        return null;
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
