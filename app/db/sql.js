module.exports = function() {
    var MariaClient = require('mariasql'),
        Sequelize = require('sequelize'),

        /* Update database credentials here
         * based on your own system's configuration
         */
        sql = {
            'dbname': 'starterpack',
            'user': 'vagrant',
            'host': '127.0.0.1',
            'password': 'vagrant',
        };

    sql.db = new MariaClient();
    sql.db.connect({
        host: sql.host,
        user: sql.user,
        password: sql.password
    });
    sql.db.query('CREATE DATABASE IF NOT EXISTS :db', {
        db: sql.dbname
    }).on('result', function(res) {
        sql.db.end();
    });

    var sequelize = exports.sequelize = new Sequelize(sql.dbname, sql.user, sql.password, {
        dialect: 'mariadb'
    });

    sequelize.authenticate().complete(function(err) {
        if (err) {
            new Error('app/db/sql.js: unable to connect to the database:', err);
        }
    });

    // include models here
    sql.User = require('../models/user');

    return sql;
}();