import { updateFuzzy } from '../core/mpi/jobs/indexarFuzzy';

function run(done) {
    updateFuzzy(done, ['documento', 'nombre', 'apellido', 'alias']);
}

export = run;
