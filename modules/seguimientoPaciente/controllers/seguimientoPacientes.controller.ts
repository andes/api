import * as mongoose from 'mongoose';
import {seguimientoPacientes} from './../schemas/seguimientoPacientes';
import { toArray } from '../../../utils/utils';

export function buscarRegistros(dni, sexo) {
    
    const query =  seguimientoPacientes.aggregate([
        {
            $match: {
                'paciente.documento': dni,
                'paciente.sexo': sexo
            }
        },
        {
            $project: {
                'paciente.registros': '$paciente.registros',
                'paciente.fechaAutodiagnostico' : '$paciente.fechaAutodiagnostico'
            }
        },
        {
            $sort: {
                'paciente.fechaAutodiagnostico': -1
            }
        }
 
    ]);

    return query;
}