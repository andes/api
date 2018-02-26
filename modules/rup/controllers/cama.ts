
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { model as cama } from '../../../core/tm/schemas/camas';

export async function buscarCamaInternacion(idInternacion, estado) {
    // let query = cama.find({
    //     $where: 'this.estados[this.estados.length - 1].estado ==  \"ocupada\" AND '
    // });


    // let req = {
    //     query: {
    //         estado: 'asignado',
    //         pacienteId: pacienteModified.id,
    //         horaInicio: moment(new Date()).startOf('day').toDate() as any
    //     }
    // };
    // let turnos: any = await turnosController.getTurno(req);
    // if (turnos.length > 0) {
    //     turnos.forEach(element => {
    //         try {
    //             agendaController.updatePaciente(pacienteModified, element);
    //         } catch (error) {
    //             return error;
    //         }
    //     });
    // }
}