const request = require('request');

export class AndesDrive {
    static _url = '';

    public static get url () {
        return this._url;
    }

    public static set url (value: string) {
        this._url = value;
    }

    public static initialize (router) {
        router.post('/drive', (req, res, next) => {
            const url = `${this.url}/drive`;
            req.pipe(request.post(url)).pipe(res);
        });

        router.get('/drive/:uuid', (req, res, next) => {
            const token = req.token;
            const uuid = req.params.uuid;
            if (token) {
                return this.readFile(uuid, token, req, res);
            }
            return next(403);
        });
    }

    public static uploadFile (token, req, res) {
        const url = `${this.url}/drive?token=${token}`;
        req.pipe(request.post(url)).pipe(res);
    }

    public static readFile (uuid, token, req, res) {
        const url = `${this.url}/drive/${uuid}?token=${token}`;
        req.pipe(request.get(url)).pipe(res);
    }
}
