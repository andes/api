"use strict";
var ValidateFormatDate = (function () {
    function ValidateFormatDate() {
    }
    ValidateFormatDate.validateDate = function (date) {
        var RegExPattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
        if ((date.match(RegExPattern)) && (date != '')) {
            return true;
        }
        else {
            return false;
        }
    };
    return ValidateFormatDate;
}());
exports.ValidateFormatDate = ValidateFormatDate;
//# sourceMappingURL=validateFormatDate.js.map