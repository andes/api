import { Profesional } from '../core/tm/schemas/profesional';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { ObjectID } from 'bson';
import moment = require('moment');

interface IDuplicado {
    _id: {
        documento: string;
    };
    count: number;
    dups: [
        {
            id: ObjectID,
            apellido: string,
            documento: string,
            nombre: string
            createdAt?: Date,
            updatedAt?: Date
        }
    ];
}

async function run(done) {
    const duplicados: IDuplicado[] = await Profesional.aggregate([
        {
            $group: {
                _id: {
                    documento: '$documento'
                },
                dups: {
                    $push: {
                        id: '$_id',
                        nombre: '$nombre',
                        apellido: '$apellido',
                        documento: '$documento',
                        createdAt: '$createdAt',
                        updatedAt: '$updatedAt'
                    }
                },
                count: {
                    $sum: 1
                }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ]);

    for (let data of duplicados) {
        // Se ordenan duplicados por fecha de creación. El ultimo registro creado será el profesional activo
        const dupsSorted = data.dups.sort((a, b) => {
            const f1 = a.createdAt || a.updatedAt;
            const f2 = b.createdAt || b.updatedAt;
            if (f1) {
                if (f2) {
                    return moment(f1).diff(moment(f2));
                } else { return 1; }
            } else { return -1; }
        });

        try {
            let profesionalPrincipal = await Profesional.findById(dupsSorted.pop().id);
            let turnos: any = [];
            let prestaciones: any = [];

            // Se actualizan turnos y prestaciones de los duplicados
            dupsSorted.map(dup => {
                turnos.push(Agenda.updateMany(
                    { 'profesionales._id': dup.id },
                    { $set: { 'profesionales.$[elemento]._id': profesionalPrincipal.id } },
                    { arrayFilters: [{ 'elemento._id': dup.id }] }
                ));
                prestaciones.push(Prestacion.updateMany(
                    { 'solicitud.profesional.id': dup.id },
                    { $set: { 'solicitud.profesional.id': profesionalPrincipal.id } }
                ));
            });
            turnos = await Promise.all(turnos);
            prestaciones = await Promise.all(prestaciones);

            // Se inactivan los duplicados
            let updated = dupsSorted.map(prof => Profesional.updateMany(
                { _id: prof.id },
                { $set: { activo: false } }
            ));
            await Promise.all(updated);

        } catch (err) {
            // tslint:disable-next-line:no-console
            console.error('DNI: ', data._id.documento, '\n', err.message);
        }
    }

    done();
}

export = run;

