import { importLAMPResults } from './../modules/forms/forms-epidemiologia/controller/forms-epidemiologia.controller';


async function run() {
    await importLAMPResults();
}
export = run;
