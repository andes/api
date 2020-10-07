import { HTMLComponent } from '../model/html-component.class';
import { loadImage } from '../model/informe.class';
import * as moment from 'moment';

export class InformeRupFooter extends HTMLComponent {
    template = `
        <!-- Firmas -->
        <span class="contenedor-firmas"></span>
        <hr>
        <span class="contenedor-zocalo">
            <img class="logo-pdp" src="data:image/png;base64,{{ logos.pdp }}">
            <article class="contenedor-data-pdp">
                <h6>Nota: El contenido de este informe ha sido validado digitalmente siguiendo los estándares de
                    calidad y seguridad
                    requeridos. El ministerio de salud de la provincia de Neuquén es responsable inscripto en el
                    Registro
                    Nacional de Protección de Datos Personales, según lo requiere la Ley N° 25.326 (art. 3° y 21 inciso
                    1).</h6>
            </article>
            <article class="contenedor-data-organizacion">
                <h6>
                    {{{ organizacion.nombre }}}
                </h6>
                <h6>
                    {{ organizacion.direccion }}
                </h6>
            </article>
            <article class="contenedor-data-impresion">
                <h6 class="bolder">Impreso por:</h6>
                <h6>
                    {{usuario.apellido}} {{usuario.nombre}}
                </h6>
                <h6>
                    {{ hora }}hs
                </h6>
            </article>
            <article class="contenedor-data-validacion">
                {{#if validacion}}
                    <h6 class="bolder">Validado por:</h6>
                    <h6>
                        {{ validacion.usuario }}
                    </h6>
                    <h6>
                        {{ validacion.fecha }}hs
                    </h6>
                {{/if}}
            </article>
            <hr>
            <span class="numeracion">
                {{{ numeracionHTML }}}
            </span>
        </span>
    `;

    constructor(public prestacion, public paciente, public organizacion, public user) {
        super();


        this.data = {
            usuario: user.usuario,
            organizacion: {
                nombre: organizacion ? organizacion.nombre.replace(' - ', '</br>') : '',
                direccion: organizacion ? organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre : ''
            },
            hora: moment().format('DD/MM/YYYY HH:mm'),
            logos: {
                pdp: loadImage('templates/rup/informes/img/logo-pdp.png'),
            },
            validacion: this.getDatosValidacion(),
            numeracionHTML: '<small> {{page}} </small> de <small> {{pages}} </small>'
        };
    }

    getDatosValidacion() {
        const lastState = this.prestacion.estados[this.prestacion.estados.length - 1];
        const esValidada = lastState.tipo === 'validada';
        if (esValidada) {
            return {
                usuario: lastState.createdBy.nombreCompleto,
                fecha: moment(lastState.createdAt).format('DD/MM/YYYY HH:mm')
            };
        }
        return null;
    }

}
