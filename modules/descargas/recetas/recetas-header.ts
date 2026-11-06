import { InformeRupHeader } from '../informe-rup/informe-header';
import { loadImage } from '../model/informe.class';

export class RecetasHeader extends InformeRupHeader {
    template = `
            <section class="contenedor-header-recetas" style="width:100%; height:1.32cm; overflow:hidden; border-bottom: solid 1px black;">
                <img src="data:image/png;base64,{{ logoHeader }}" style="width:100%; display:block; margin-top:-0.62cm;">
            </section>
            <section class="contenedor-data-origen">
                <!-- Datos paciente -->
                <span class="contenedor-principal-data">
                    <div class="contenedor-secundario">
                        <h6 class="volanta">Datos del paciente</h6>
                        <h4>
                            {{ paciente.apellido }},
                                {{#if paciente.alias}}
                                    {{paciente.alias}}
                                {{else}}
                                     {{paciente.nombre}}
                                {{/if}}
                        </h4>
                        <h4>
                            {{ paciente.genero }} |
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
                            <h6>
                                <b>Nro. Afiliado: </b>
                                {{#if paciente.numeroAfiliado}}
                                    {{ paciente.numeroAfiliado }}
                                {{else}}
                                    Sin datos
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

    constructor(prestacion, paciente, organizacion, cama) {
        super(prestacion, paciente, organizacion, cama);
        this.data.logoHeader = loadImage('templates/matriculaciones/img/header-matriculaciones.png');
    }
}
