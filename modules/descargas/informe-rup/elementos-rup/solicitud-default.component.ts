import { HTMLComponent } from '../../model/html-component.class';

export class SolicitudPrestacionDefaultComponent extends HTMLComponent {
    template = `
            <div class="nivel-1">
                <p>
                    Solicitud de {{ registro.concepto.term }}:
                </p>
            </div>
            <div class="subregistro">
                <p> Motivo: <small> {{{ valor.motivo }}} </small> </p>
                <p> Indicaciones: <small> {{{ valor.indicaciones }}} </small> </p>
                {{#if valor.organizacionDestino}}
                    <p> Organización destino: <small> {{{ valor.organizacionDestino }}} </small> </p>
                {{/if}}
                <p> Profesional(es): <small> {{{ valor.profesionalesDestino }}} </small> </p>
            </div>

        `;
    constructor(private prestacion, private registro, private params, private depth) {
        super();
    }

    async process() {
        const datos = this.registro.valor.solicitudPrestacion;
        this.data = {
            registro: this.registro,
            valor: {
                motivo: datos.motivo,
                indicaciones: datos.indicaciones,
                organizacionDestino: datos.organizacionDestino?.nombre,
                profesionalesDestino: datos.profesionalesDestino?.map(y => y.nombreCompleto).join(' ')
            }
        };
    }

}
