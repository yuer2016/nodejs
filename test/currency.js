var canadianDollar = 0.91;

function roundTwoDecimal(amount){

    return Math.round(amount * 100)/100;
}

exports.canadianToUs = function (canadian){
    return roundTwoDecimal(canadian * canadianDollar);
}

exports.UsToCanadian = function(us){
    return roundTwoDecimal(us/canadianDollar);
}