import { updateFuzzy } from '../controller/updateFuzzy';

function run(done) {
    updateFuzzy(done, ['documento']);
}

export = run;
