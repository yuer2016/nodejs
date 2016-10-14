'use strict';

var config = {
    "baseredis": {
		"address":"192.168.0.250",
		"port":"6379"
	},
    "basemysql": {
        "user": "root",
        "pwd": "Ou-e_123",
        "dbname": "mdcom2",
        "dbip": "192.168.0.99",
        "port": 3306
    },
    "zusumysql": {
        "user": "root",
        "pwd": "Ou-e_123",
        "dbname": "mdcom2",
        "dbip": "192.168.0.99",
        "port": 3306
    },
    "mongodb": {
        "dbname": "qxt",
        "dbip": "192.168.0.250",
        "dbport": 27017
    }
}

module.exports = config;