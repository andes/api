import { HTMLComponent } from '../model/html-component.class';
import * as moment from 'moment';
import { loadImage } from '../model/informe.class';
import * as configPrivate from '../../../config.private';

export class InformeRupHeader extends HTMLComponent {
    template = `
            <!-- Cabezal logos institucionales -->
            <section class="contenedor-logos">
                <span class="contenedor-logo-efector">
                    {{#if logos.organizacion}}
                        <img class="logo-efector" src="data:image/png;base64,{{ logos.organizacion }}">
                    {{else}}
                        <b class="no-logo-efector">
                            {{{ organizacion.nombre }}}
                        </b>
                    {{/if}}
                </span>
                <span class="contenedor-logos-secundarios">
                    <img class="logo-adicional" src="data:image/png;base64,{{ logos.adicional }}">
                    <img class="logo-andes" src="data:image/png;base64,{{ logos.andes  }}">
                </span>
            </section>
            <section class="contenedor-data-origen">
                <!-- Datos paciente -->
                <span class="contenedor-principal-data">
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos del paciente</h6>
                        <h4>
                            {{ paciente.apellido }}, {{ paciente.nombre }}
                        </h4>
                        <h4>
                            {{ paciente.sexo }} |
                            {{#if paciente.edad }}
                                {{ paciente.edad }} años |
                            {{/if}}
                            {{ paciente.documento }}
                        </h4>
                    </div>
                    <div class="contenedor-secundario">
                    <div class="contenedor-bloque-texto" >
                                <h6>
                                <b>Obra Social: </b>

                                {{#if paciente.obraSocial}}
                                {{paciente.obraSocial}}
                                {{else}}
                                sin obra social
                                {{/if}}
                            </h6>
                    </div>
                    </div>
                    <div class="contenedor-secundario">
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">
                                Fecha de Nac.
                            </h6>
                            <h6>
                                {{ paciente.fechaNacimiento }}
                            </h6>
                        </div>
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">
                                Nro. de carpeta
                            </h6>
                            <h6>
                                {{#if paciente.numeroCarpeta }}
                                    {{ paciente.numeroCarpeta }}
                                {{else}}
                                    sin número de carpeta
                                {{/if}}
                            </h6>
                        </div>

                    </div>
                    {{#if ubicacion}}
                        <div class="contenedor-secundario">
                            <div class="contenedor-bloque-texto">
                                <h6 class="bolder">
                                    Internación
                                </h6>
                                {{ubicacion}}
                            </div>
                        </div>
                    {{/if}}
                </span>

                <!-- Datos origen solicitud -->
                <span class="contenedor-principal-data">
                {{#if origenTop}}
                    <div class="contenedor-secundario">
                        <h6 class="volanta">DATOS DE ORIGEN DE SOLICITUD</h6>
                            <h4>
                                {{{ origen.efectorOrigen }}}
                            </h4>
                    </div>

                    <div class="contenedor-secundario">
                        <div class="contenedor-bloque-texto">
                                <h6 class="bolder">Profesional</h6>
                                <h6>
                                    {{ origen.profesionalOrigenApellido }}, {{ origen.profesionalOrigenNombre }}
                                </h6>
                        </div>
                    </div>
                    <div class="contenedor-bloque-texto">
                        <h6 class="bolder">
                            Fecha Solicitud
                        </h6>
                        <h6>
                            {{ origen.fechaSolicitud }}hs
                        </h6>
                    </div>
                {{else}}
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos de la prestación</h6>
                        <h4>
                            {{{ organizacion.nombre }}}
                        </h4>
                        <h5>
                            {{ organizacion.direccion }}
                        </h5>
                    </div>

                    <div class="contenedor-secundario">
                        <div class="contenedor-bloque-texto">
                            <h6 class="bolder">Profesional</h6>
                            <h6>
                                {{ profesional.apellido }}, {{ profesional.nombre }}
                            </h6>
                        </div>
                    </div>
            {{/if}}
                </span>
            </section>
            {{#unless consultaValidada }}
                <h1 class="marca-de-agua">
                    Prestación no validada por profesional
                </h1>
            {{/unless}}
    `;

    constructor(public prestacion, public paciente, public organizacion, public cama) {
        super();

        // [TODO] helpers date formats en Handlerbars

        const fechaNacimiento = paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('DD/MM/YYYY') : 's/d';
        const fechaPrestacion = moment(prestacion.ejecucion.fecha);
        const edad = paciente.fechaNacimiento && fechaPrestacion.diff(moment(paciente.fechaNacimiento), 'years');
        const organizacionId = String(prestacion.ejecucion.organizacion.id);
        const origenTop = (prestacion.inicio === 'top');
        const solicitudOrigen = prestacion.solicitud;
        const fechaSolicitud = this.prestacion.solicitud.fecha;

        // [TODO] metodo getCarpeta en paciente
        const numeroCarpeta = paciente.carpetaEfectores.find(x => String(x.organizacion._id) === organizacionId);
        const consultaValidada = (prestacion.estados[prestacion.estados.length - 1].tipo === 'validada');
        const provincia = configPrivate.provincia || 'neuquen';
        this.data = {
            paciente: {
                nombre: paciente.nombre,
                apellido: paciente.apellido,
                alias: paciente.alias || undefined,
                sexo: paciente.sexo,
                genero: paciente.genero,
                fechaNacimiento,
                documento: paciente.documento,
                numeroIdentificacion: paciente.numeroIdentificacion || undefined,
                edad,
                numeroCarpeta: numeroCarpeta?.nroCarpeta,
                obraSocial: prestacion.paciente.obraSocial ? prestacion.paciente.obraSocial.financiador : false
            },
            organizacion: {
                nombre: organizacion ? organizacion.nombre.replace('-', '</br>') : '',
                direccion: organizacion ? organizacion.direccion.valor + ', ' + organizacion.direccion.ubicacion.localidad.nombre : ''
            },
            origen: {
                efectorOrigen: solicitudOrigen.organizacionOrigen.nombre ? solicitudOrigen.organizacionOrigen.nombre.replace('-', '</br>') : '',
                profesionalOrigenNombre: solicitudOrigen.profesionalOrigen.nombre,
                profesionalOrigenApellido: solicitudOrigen.profesionalOrigen.apellido,
                fechaSolicitud: moment(fechaSolicitud).format('DD/MM/YYYY HH:mm')
            }
            ,
            profesional: {
                nombre: prestacion.solicitud.profesional.nombre,
                apellido: prestacion.solicitud.profesional.apellido
            },
            consultaValidada,
            logos: {
                adicional: loadImage(`templates/rup/informes/img/logo-adicional-${provincia}.png`),
                andes: loadImage('templates/rup/informes/img/logo-andes-h.png'),
                organizacion: organizacion ? this.getLogoOrganizacion(organizacion) : ''
            },
            ubicacion: this.ubicacionName(),
            origenTop
        };

    }

    getLogoOrganizacion(organizacion) {
        try {
            const nombreLogo = organizacion.nombre.toLocaleLowerCase().replace(/-|\./g, '').replace(/ {2,}| /g, '-');
            const realPath = `templates/rup/informes/img/efectores/${nombreLogo}.png`;
            return loadImage(realPath);
        } catch {
            return null;
        }
    }

    ubicacionName() {
        if (this.cama) {
            return `${this.cama.nombre}, ${this.cama.sectorName}`;
        }
        return null;
    }
}
