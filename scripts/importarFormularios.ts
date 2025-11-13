import { FtpSistema } from '../../api/core/tm/schemas/ftpSistema';
import { FtpFuncion } from '../../api/core/tm/schemas/ftpFuncion';
import { FtpGrupoFarmacologico } from '../../api/core/tm/schemas/ftpGrupoFarmacologico';
import { FormularioTerapeutico } from '../../api/core/tm/schemas/formularioTerapeutico';

const baseFarmacias = '../api/scripts/baseFarmacia.json';
const fsp = require('fs/promises');


async function run(done) {
    try {

        const dataFarmacia = await fsp.readFile(baseFarmacias, { encoding: 'utf8' });
        const dataFarmaciaArray = JSON.parse(dataFarmacia) as any[];

        for (const item of dataFarmaciaArray) {
            let sistema = await FtpSistema.findOne({ nombre: item.sistema });
            if (!sistema) {
                sistema = await FtpSistema.create({ nombre: item.sistema });
            }

            let funcion = await FtpFuncion.findOne({ nombre: item.funcion });
            if (!funcion) {
                funcion = await FtpFuncion.create({ nombre: item.funcion });
            }

            let grupo = await FtpGrupoFarmacologico.findOne({ nombre: item.grupoFarmacologico });
            if (!grupo) {
                grupo = await FtpGrupoFarmacologico.create({ nombre: item.grupoFarmacologico });
            }

            // Crear el formulario terapéutico
            await FormularioTerapeutico.create({
                sistema: sistema.toObject(),
                funcion: funcion.toObject(),
                grupoFarmacologico: grupo.toObject().nombre ? grupo.toObject() : null,
                nivelComplejidad: item.nivelComplejidad,
                especialidad: item.especialidad,
                requisitos: item.requisitos,
                carroEmergencia: item.carroEmergencia,
                medicamento: item.medicamento,
                indicaciones: item.indicaciones,
                recomendacionesDeUso: item.recomendacionesDeUso,
                principioActivo: item.principioActivo,
                via: item.via,
                formaFarmaceutica: item.formaFarmaceutica,
                potencia: item.potencia,
                unidades: item.unidades,
                presentacion: item.presentacion,
                atcVia: item.atcVia,
                snomed: Number(item.snomed) || undefined
            });
        }
    } catch (error) {
    }
    done();
}

export = run;
