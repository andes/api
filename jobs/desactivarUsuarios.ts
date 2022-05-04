
import { verificarUltimoLogueo } from './../core/tm/controller/authUser';

async function run(done) {
    await verificarUltimoLogueo(done);
}

export = run;
