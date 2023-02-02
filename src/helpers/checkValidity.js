const isLuhn = (value) => {
    let nCheck = 0;
    let bEven = false;
    const newValue = value.replace(/\D/g, '');
    for (let n = newValue.length - 1; n >= 0; n--) {
        const cDigit = newValue.charAt(n);
        let nDigit = parseInt(cDigit, 10);
        if (bEven && (nDigit *= 2) > 9) nDigit -= 9;
        nCheck += nDigit;
        bEven = !bEven;
    }
    return nCheck % 10 == 0;
};
const isValidIMEI = (imei) => {
    return imei.trim().length === 15 && isLuhn(imei.trim());
};
const isIMEIValid = (value) => !!value && isValidIMEI(value);

const promiseHandler = (value) => (condition, errorMessage) =>
    new Promise((resolve, reject) =>
        condition(value) ? resolve() : reject(new Error(errorMessage))
    );
const customInputValidator = ({ field }, value) => {
    const handlePromise = promiseHandler(value);
    switch (field) {
        case 'imei': {
            return handlePromise(isIMEIValid, 'Please enter a valid IMEI.');
        }
        default:
            return null;
    }
};

export { customInputValidator };
