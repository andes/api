import { userScheduler } from '../config.private';
import { Profesional } from '../core/tm/schemas/profesional';
import { Auth } from '../auth/auth.class';

// Actualiza sexo de profesionales a minusculas
async function run(done) {
    const cursor = Profesional.find({
        $and: [
            { sexo: { $exists: true } },
            { sexo: { $nin: ['femenino', 'masculino'] } }]
    }).cursor({ batchSize: 100 });;
    const updateSexo = async (profesional) => {
        try {
            if (profesional.sexo) {
                profesional.sexo = profesional.sexo.toLowerCase();
                Auth.audit(profesional, (userScheduler as any));
                await profesional.save();
            }
        } catch (error) {
            return;
        }
    };
    await cursor.eachAsync(async (prof) => {
        await updateSexo(prof);
    });
    done();
}

export = run;
