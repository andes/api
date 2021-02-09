import * as moment from 'moment';
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
            {{#if firmaHTML}}
                {{{ firmaHTML }}}
            {{/if}}
        </section>
    </main>

    `;

    constructor(public derivacion) {
        super();
    }

    public async process() {

        let finalizada = false;
        let elementoHistorial: any;
        let fechaFinalizacion = moment().toDate();
        let profesional: any;
        if (this.derivacion.estado === 'finalizada') {
            finalizada = true;
            elementoHistorial = this.derivacion.historial.find(elemento => elemento.estado === 'finalizada');
            fechaFinalizacion = elementoHistorial.createdAt;
            profesional = elementoHistorial.createdBy;
        }

        const firmaHTML = await this.getFirmaHTML();
        this.data = {
            idDerivacion: this.derivacion._id,
            nombre: this.derivacion.paciente.nombre,
            apellido: this.derivacion.paciente.apellido,
            dni: this.derivacion.paciente.documento,
            fechaNacimiento: moment(this.derivacion.paciente.fechaNacimiento).format('DD/MM/YYYY'),
            sexo: this.derivacion.paciente.sexo,
            obraSocial: this.derivacion.paciente.obraSocial,
            organizacionOrigen: this.derivacion.organizacionOrigen.nombre,
            organizacionDestino: this.derivacion.organizacionDestino.nombre,
            fecha: moment(this.derivacion.historial[0].createdAt).format('DD/MM/YYYY HH:mm'),
            finalizada,
            fechaFinalizacion: moment(fechaFinalizacion).format('DD/MM/YYYY HH:mm'),
            profesionalFinalizacion: profesional,
            tipoTraslado: this.derivacion.tipoTraslado,
            organizacionTraslado: this.derivacion.organizacionTraslado,
            firmaHTML
        };
    }

    async getFirmaHTML() {
        if (this.derivacion.estado === 'finalizada') {
            const firmaHTMLComponent = new DerivacionFirma(this.derivacion);
            await firmaHTMLComponent.process();
            return firmaHTMLComponent.render();
        } else {
            return null;
        }
    }
}
