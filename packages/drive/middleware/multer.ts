
const multer = require('multer');


function AdapterStorage(adapter) {
    this.adapter = adapter;
}

AdapterStorage.prototype._handleFile = function _handleFile(req, file, cb) {
    this.adapter.write(file.stream).then(id => {
        cb(null, { id, adapter: this.adapter.name });
    });
};

AdapterStorage.prototype._removeFile = function _removeFile(req, file, cb) {
    cb(null, true);
};

export default (adapter) => {
    const fileMulterAdapter = new AdapterStorage(adapter);
    return multer({ storage: fileMulterAdapter });
};

