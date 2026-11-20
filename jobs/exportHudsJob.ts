import { exportHudsPending } from '../modules/huds/export-huds/exportHuds.controller';

function run(done, args: string[] = []) {
    const onlyToday = args.includes('--hoy') || args.includes('--today') || args.includes('hoy');
    exportHudsPending({ onlyToday }).then(() => {
        done();
    }, () => {
        done();
    });
}

export = run;
