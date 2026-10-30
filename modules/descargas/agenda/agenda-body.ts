import * as moment from 'moment';
import { HTMLComponent } from '../model/html-component.class';

export class AgendaBody extends HTMLComponent {
    template = `
    {{#each agendas}}
    <section class="bordered-section">
        <header>
            <div class="row">
                <div class="col">
                    <label>Agenda: </label> {{dia}} {{fecha}}, {{ horaDesde }} a {{ horaHasta }} hs
                </div>
                <div class="col">
                    <label>Tipo de prestación: </label>
                    <span>
                        {{#each tipoPrestaciones}}
                            {{nombre}}-
                        {{/each}}
                    </span>
                </div>
                <div class="col">
                    <label>Equipo de Salud: </label>
                    {{#if profesionales}}
                        <span>
                            {{#each profesionales}}
                                {{apellido}},{{nombre}}-
                            {{/each}}
                        </span>
                    {{else}}
                        <span>Equipo de Salud no asignado</span>
                    {{/if}}
                </div>
            </div>
        </header>
        <!--Listado de turnos-->
        <!--Turnos-->
        {{#each bloques}}
            <table class="table">
                <thead>
                    <tr colspan="12">Bloque de {{inicioBloque}} a {{finBloque}} hs
                    {{#if descripcion}}
                        <span>Descripción: {{descripcion}}</span>
                    {{/if}}
                    </tr>
                    <tr>
                        <th>Hora</th>
                        <th>DNI | Nro. Carpeta</th>
                        <th>Obra Social</th>
                        <th>Apellidos y Nombres</th>
                        <th>Estado</th>
                        <th>Fecha Nac</th>
                        <th>Sexo</th>
                        <th>Identidad de género</th>
                        <th>Diagnóstico</th>
                        <th>Primera Vez</th>
                        <th>Ulterior</th>
                        <th>C2</th>
                    </tr>
                </thead>
                <tbody>
                {{#each turnos}}
                <tr>
                    <td>
                        <small>
                            <strong>{{inicio}}</strong>
                        </small>
                    </td>
                    <td>
                    <small>
                        {{#if paciente}}
                            {{#if paciente.documento}}
                                <span>{{paciente.documento}}</span>
                            {{else}}
                                <span>Sin documento(temporal)</span>
                            {{/if}}
                                <span>| {{paciente.carpeta}}</span>
                            {{#if autocitado}}
                                <small>(autocitado)</small>
                            {{/if}}
                        {{/if}}
                    </small>
                    </td>
                    <td>
                        <small>
                        {{#if paciente}}
                            {{#if paciente.obraSocial}}
                                {{#if paciente.obraSocial.financiador}}
                                    {{paciente.obraSocial.financiador}}
                                {{/if}}
                                {{#if paciente.obraSocial.numeroAfiliado}}
                                    <br>{{paciente.obraSocial.numeroAfiliado}}
                                {{/if}}
                            {{/if}}
                        {{/if}}
                        </small>
                    </td>
                    <td>
                        <small>
                        {{#if paciente}}
                            {{#if paciente.id}}
                                {{#if paciente.alias}}
                                    {{paciente.apellido}}, {{paciente.alias}}
                                {{else}}
                                    {{paciente.apellido}}, {{paciente.nombre}}
                                {{/if}}
                            {{/if}}
                        {{/if}}
                        </small>
                    </td>
                    <td>
                        <small><strong>{{estadoTurno}}</strong></small>
                    </td>
                    <td>
                        <small>
                        {{paciente.nacimiento}}
                        </small>
                    </td>
                    <td>
                        <small>
                        {{paciente.sexo}}
                        </small>
                    </td>
                    <td>
                        <small>
                        {{paciente.genero}}
                        </small>
                    </td>
                    <td class="diagnostico"></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                {{/each}}
                </tbody>
            </table>
        {{/each}}
        <!--Listado de sobreturnos-->
        <!--Turnos-->
        {{#if cantSobreturnos}}
            <table class="table">
                <thead>
                    <tr colspan="12">
                        <span>Sobreturnos</span>
                    </tr>
                    <tr>
                        <th>Hora</th>
                        <th>DNI | Nro. Carpeta</th>
                        <th>Obra Social</th>
                        <th>Apellidos y Nombres</th>
                        <th>Estado</th>
                        <th>Fecha Nac</th>
                        <th>Sexo</th>
                        <th>Identidad de género</th>
                        <th>Diagnóstico</th>
                        <th>Primera Vez</th>
                        <th>Ulterior</th>
                        <th>C2</th>
                    </tr>
                </thead>
                <tbody>
                {{#each sobreturnos}}
                    <tr>
                        <td>
                            <small>
                            <strong>{{inicioSobreturno}}</strong>
                            </small>
                        </td>
                        <td>
                            <small>
                            {{#if paciente}}
                                {{#if paciente.documento}}
                                    <small>{{paciente.documento}}</small>
                                {{else}}
                                    <small>Sin documento(temporal)</small>
                                {{/if}}
                                <span>| {{paciente.carpeta}}</span>
                                {{#if autocitado}}
                                    <small>(autocitado)</small>
                                {{/if}}
                            {{/if}}
                            </small>
                        </td>
                        <td>
                            <small>
                            {{#if paciente}}
                                {{#if paciente.obraSocial}}
                                    {{#if paciente.obraSocial.financiador}}
                                        {{paciente.obraSocial.financiador}}
                                    {{/if}}
                                {{/if}}
                            {{/if}}
                            </small>
                        </td>
                        <td>
                            <small>
                            {{#if paciente}}
                                {{#if paciente.id}}
                                    {{#if paciente.alias}}
                                        {{paciente.apellido}}, {{paciente.alias}}
                                    {{else}}
                                        {{paciente.apellido}}, {{paciente.nombre}}
                                    {{/if}}
                                {{/if}}
                            {{/if}}
                            </small>
                        </td>
                        <td>
                            <small><strong>{{estadoTurno}}</strong></small>
                        </td>
                        <td>
                            <small>
                                {{paciente.nacimiento}}
                            </small>
                        </td>
                        <td>
                            <small>
                            {{paciente.sexo}}
                            </small>
                        </td>
                        <td>
                            <small>
                            {{paciente.genero}}
                            </small>
                        </td>
                        <td class="diagnostico"></td>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                {{/each}}
                </tbody>
            </table>
        {{/if}}

        <div class="firma">
            <label>Firma Equipo de Salud</label>
        </div>
    </section>
    {{#unless @last}}
        <div style="page-break-after: always;"></div>
    {{/unless}}
    {{/each}}
    `;

    constructor(public _data) {
        super();
        const agendas = Array.isArray(_data.agendas) ? _data.agendas : (_data.dataBody ? [_data.dataBody] : []);
        this.data = {
            agendas: agendas.map(agenda => this.prepararAgenda(agenda))
        };
    }

    private prepararAgenda(agenda) {
        const data: any = {
            dia: moment(agenda.horaInicio).locale('es').format('dddd'),
            fecha: moment(agenda.horaInicio).locale('es').format('L'),
            horaDesde: moment(agenda.horaInicio).locale('es').format('HH:mm'),
            horaHasta: moment(agenda.horaFin).locale('es').format('HH:mm'),
            tipoPrestaciones: agenda.prestaciones,
            bloques: agenda.bloques || [],
            profesionales: agenda.profesionales,
            organizacion: agenda.organizacion,
            sobreturnos: agenda.sobreturnos || [],
            cantSobreturnos: agenda.sobreturnos?.length ? true : false
        };

        // TURNOS
        data.bloques.forEach(bloque => {
            bloque.inicioBloque = moment(bloque.horaInicio).locale('es').format('HH:mm');
            bloque.finBloque = moment(bloque.horaFin).locale('es').format('HH:mm');
            bloque.turnos.forEach(turno => {
                turno.inicio = moment(turno.horaInicio).locale('es').format('HH:mm');

                if (turno?.paciente?.id && turno?.paciente?.fechaNacimiento) {
                    turno.paciente.nacimiento = moment.utc(turno.paciente.fechaNacimiento).locale('es').format('DD/MM/YYYY');
                }

                turno.autocitado = (turno.tipoTurno === 'profesional') ? true : false;

                if (turno?.paciente?.id && turno.paciente.carpetaEfectores?.length) {
                    turno.paciente.carpetaEfectores.forEach(carpeta => {
                        if (JSON.stringify(carpeta.organizacion._id) === JSON.stringify(data.organizacion._id)) {
                            turno.paciente.carpeta = carpeta.nroCarpeta;
                        }
                    });
                }
                if (turno && turno.estado === 'turnoDoble') {
                    turno.estadoTurno = 'Turno Doble';
                } else if (turno && turno.estado === 'suspendido') {
                    turno.estadoTurno = 'Suspendido';
                } else {
                    turno.estadoTurno = '';
                }
            });
        });

        // SOBRETURNOS
        data.sobreturnos.forEach(sobreturno => {
            sobreturno.inicioSobreturno = moment(sobreturno.horaInicio).locale('es').format('HH:mm');
            sobreturno.estadoTurno = (sobreturno && sobreturno.estado === 'suspendido') ? 'Suspendido' : '';
            sobreturno.autocitado = (sobreturno.tipoTurno === 'profesional') ? true : false;

            if (sobreturno?.paciente?.id && sobreturno?.paciente?.fechaNacimiento) {
                sobreturno.paciente.nacimiento = moment.utc(sobreturno.paciente.fechaNacimiento).locale('es').format('DD/MM/YYYY');
            }

            if (sobreturno?.paciente?.id && sobreturno.paciente.carpetaEfectores?.length) {
                sobreturno.paciente.carpetaEfectores.forEach(carpeta => {
                    if (JSON.stringify(carpeta.organizacion._id) === JSON.stringify(data.organizacion._id)) {
                        sobreturno.paciente.carpeta = carpeta.nroCarpeta;
                    }
                });
            }
        });

        return data;
    }
}
