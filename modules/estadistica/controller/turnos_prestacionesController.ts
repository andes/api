import * as agendaController from './../controller/procesarAgendas';
import * as fueraDeAgendaController from './../controller/procesarFueraDeAgenda';
import { Types } from 'mongoose';

export async function armarListado(datos) {
    const parametros = {
        organizacion: Types.ObjectId(datos.organizacion),
        fechaDesde: datos.fechaDesde,
        fechaHasta: datos.fechaHasta,
        prestacion: datos.prestacion,
        estado: datos.estado,
        profesional: datos.idProfesional,
        financiador: datos.financiador,
        estadoFacturacion: datos.estadoFacturacion,
        paciente: datos.paciente,
        ambito: datos.ambito,
        noNominalizada: datos.noNominalizada,
    };

    // Procesa los turnos aplicando los filtros
    const _turnos = parametros?.ambito === 'internacion' ? [] : agendaController.procesar(parametros);
    // Procesa las prestaciones fuera de agenda
    const _prestaciones = fueraDeAgendaController.procesar(parametros);
    const [turnos, prestaciones] = await Promise.all([_turnos, _prestaciones]);
    const resultado: any = turnos.concat(prestaciones);
    return resultado;

}

export function obtenerProfesionales(profesionales) {
    let salida = '';
    profesionales.forEach(element => {
        salida += element.apellido + ', ' + element.nombre + ' - ';
    });
    return salida.slice(0, -3);
}

