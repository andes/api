import * as moment from 'moment';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Derivaciones } from '../../../modules/centroOperativoMedico/schemas/derivaciones.schema';
import { HTMLComponent } from '../model/html-component.class';
import { DerivacionFirma } from './derivacion-firma';

export class DerivacionBody extends HTMLComponent {
    template = `
        <main>
        <section class="bordered-section">
            <div class="row">
                <div class="col">
                    <span><b>DATOS DE PACIENTE</b></span>
                </div>
            </div>
            <br>
            <div class="row">
                <div class="col">
                    <span>NOMBRE Y APELLIDO:
                        {{ nombre }} {{ apellido }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>DOCUMENTO:
                        {{ dni }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>FECHA DE NACIMIENTO:
                        {{ fechaNacimiento }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>SEXO:
                        {{ sexo }}</span>
                </div>
            </div>
            {{#if obraSocial }}
            <div class="row">
                <div class="col">
                    <span>OBRA SOCIAL: {{ obraSocial.financiador }}</span>
                </div>
            </div>
            {{/if}}
            <br><br>
            <div class="row">
                <div class="col">
                    <span><b>DATOS DE DERIVACIÓN</b></span>
                </div>
            </div>
            <br>
            <div class="row">
                <div class="col">
                    <span>ID:
                        {{ idDerivacion }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>ORIGEN:
                        {{ organizacionOrigen }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>DESTINO:
                        {{ organizacionDestino }}</span>
                </div>
            </div>
            {{#if unidadDestino }}
            <div class="row">
                <div class="col">
                    <span>UNIDAD DESTINO: {{ unidadDestino }}</span>
                </div>
            </div>
            {{/if}}
            <div class="row">
                <div class="col">
                    <span>FECHA Y HORA DE DERIVACIÓN: {{ fecha }} hs</span>
                </div>
            </div>
            {{#if tipoTraslado}}
                <div class="row" >
                    <div class="col">
                        <span>TIPO TRASLADO:
                            {{ tipoTraslado.nombre }}</span>
                    </div>
                </div>
            {{/if}}
            {{#if organizacionTraslado}}
                <div class="row" >
                    <div class="col">
                        <span>TRASLADO A CARGO DE:
                            {{ organizacionTraslado.nombre }}</span>
                    </div>
                </div>
            {{/if}}

            {{#if finalizada }}
            <div class="row">
                <div class="col">
                    <span>FINALIZADA EL: {{ fechaFinalizacion }} hs</span>
                </div>
            </div>
            <div class="row">
            <div class="col">
                <span>PROFESIONAL QUE FINALIZA: {{ profesionalFinalizacion.nombreCompleto }}</span>
            </div>
            </div>
            {{/if}}


            {{#if datosSolicitud}}
            <br><br>
            <div class="row">
                <div class="col">
                    <span><b>DATOS DE SOLICITUD</b></span>
                </div>
            </div>
            <br>
            <div class="row">
                <div class="col">
                    <span>FECHA y HORA:
                        {{ datosSolicitud.fecha }} hs</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>ORGANIZACION:
                        {{ datosSolicitud.organizacion }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>USUARIO:
                        {{ datosSolicitud.usuario }}</span>
                </div>
            </div>
            <div class="row">
                <div class="col">
                    <span>DETALLE: {{ datosSolicitud.detalle }}</span>
                </div>
            </div>
            {{/if}}

            {{#if historial }}
            <br><br>
            <div class="row">
                <div class="col">
                    <span><b>HISTORIAL DE DERIVACIÓN</b></span>
                </div>
            </div>
            <style>
                table, th, td {
                    border: 1px solid grey;
                }

                table {
                    border-collapse: collapse;
                    page-break-before: always;
                    float:left;
                    font-size: 7px;
                    line-height: normal;
                }

            </style>
            <br/>
            <font size="1" >
            <table>
                <thead style='display: table-header-group' >
                    <th>Fecha</th>
                    {{#if reporteCOM }}<th>Organización</th>{{/if}}
                    <th>Evento</th>
                    {{#if reporteCOM }}<th>Prioridad</th>{{/if}}
                    <th>Observación</th>
                    <th>Usuario</th>
                    {{#if reporteCOM }}<th>Org. Destino</th>{{/if}}
                </thead>

                {{#each historial}}

                <tr>
                    <td>{{ fechaCreacion }}</td>
                    {{#if reporteCOM }}<td>{{ createdBy.organizacion.nombre }}</td>{{/if}}
                    <td>{{#if estado }}{{ estado }}{{/if}} {{#if esActualizacion }}actualización{{/if}}</td>
                    {{#if reporteCOM }}<td>{{#if prioridad}}{{ prioridad }}{{/if}}</td>{{/if}}
                    <td>{{#if observacion}}{{observacion}}{{/if}}</td>
                    <td>{{ createdBy.nombreCompleto }}</td>
                    {{#if reporteCOM }}<td>{{#if organizacionDestino}}{{ organizacionDestino.nombre }}{{/if}}</td>{{/if}}
                </tr>

                {{/each}}

            </table>
            </font>

            {{/if}}

            {{#if firmaHTML}}
                {{{ firmaHTML }}}
            {{/if}}
        </section>
    </main>

    `;

    constructor(public _data) {
        super();
    }

    public async process() {
        const derivacion: any = await Derivaciones.findById(this._data.derivacionId);

        let finalizada = false;
        let elementoHistorial: any;
        let fechaFinalizacion = moment().toDate();
        let profesional: any;
        if (derivacion.estado === 'finalizada') {
            finalizada = true;
            elementoHistorial = derivacion.historial.find(elemento => elemento.estado === 'finalizada');
            fechaFinalizacion = elementoHistorial.createdAt;
            profesional = elementoHistorial.createdBy;
        }
        const firmaHTML = await this.getFirmaHTML(derivacion);
        const datosSolicitud = derivacion ? await this.getDatosSolicitud(derivacion) : null;
        const fecha = derivacion.historial ? moment(derivacion.historial[0].createdAt).format('DD/MM/YYYY HH:mm') : null;
        const organizacion = this._data.historial && this._data.organizacionId ? await Organizacion.findById(this._data.organizacionId) : null;
        const historial = this._data.historial ? await this.getHistorialDerivacion(organizacion, derivacion) : null;
        this.data = {
            idDerivacion: derivacion._id,
            nombre: derivacion.paciente.nombre,
            apellido: derivacion.paciente.apellido,
            dni: derivacion.paciente.documento,
            fechaNacimiento: moment(derivacion.paciente.fechaNacimiento).format('DD/MM/YYYY'),
            sexo: derivacion.paciente.sexo,
            obraSocial: derivacion.paciente.obraSocial,
            organizacionOrigen: derivacion.organizacionOrigen.nombre,
            organizacionDestino: derivacion.organizacionDestino?.nombre,
            unidadDestino: derivacion.unidadDestino?.term,
            fecha,
            finalizada,
            fechaFinalizacion: moment(fechaFinalizacion).format('DD/MM/YYYY HH:mm'),
            profesionalFinalizacion: profesional,
            tipoTraslado: derivacion.tipoTraslado,
            organizacionTraslado: derivacion.organizacionTraslado,
            datosSolicitud,
            firmaHTML,
            historial,
            reporteCOM: organizacion?.esCOM
        };
    }

    async getFirmaHTML(derivacion) {
        if (derivacion.estado === 'finalizada') {
            const firmaHTMLComponent = new DerivacionFirma(derivacion);
            await firmaHTMLComponent.process();
            return firmaHTMLComponent.render();
        } else {
            return null;
        }
    }

    async getHistorialDerivacion(organizacion, derivacion) {
        derivacion.historial.shift();
        let historial = organizacion.esCOM ? derivacion.historial : derivacion.historial.filter((h) => h.createdBy.organizacion.id === organizacion.id);
        historial = historial.filter(h => !h.eliminado);
        historial.forEach(h => {
            h.fechaCreacion = moment(h.createdAt).locale('es').format('DD/MM/YYYY HH:mm');
            h.reporteCOM = organizacion.esCOM;
            h.esActualizacion = !h?.estado;
        });
        return historial.sort((a, b) => b.createdAt - a.createdAt);
    }

    async getDatosSolicitud(derivacion) {
        const estadoSolicitud = derivacion.historial[0];
        const datosSolicitud = {
            fecha: moment(estadoSolicitud.createdAt).format('DD/MM/YYYY HH:mm'),
            organizacion: estadoSolicitud.createdBy.organizacion.nombre,
            usuario: estadoSolicitud.createdBy.nombreCompleto,
            detalle: derivacion.detalle
        };

        return datosSolicitud;
    }
}
