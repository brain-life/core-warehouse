'use strict';

const express = require('express');
const router = express.Router();
const jwt = require('express-jwt');
const winston = require('winston');

const config = require('../config');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');

function canedit(user, rec) {
    if(user) {
        if(user.scopes.warehouse && ~user.scopes.warehouse.indexOf('admin')) return true;
        if(~rec.admins.indexOf(user.sub.toString())) return true;
    }
    return false;
}
    
/**
 * @apiGroup Project
 * @api {get} /project          Query projects
 * @apiDescription              Query projects registered
 *
 * @apiParam {Object} [find]    Optional Mongo find query - defaults to {}
 * @apiParam {Object} [sort]    Optional Mongo sort object - defaults to {}
 * @apiParam {String} [select]  Fields to load - multiple fields can be entered with %20 as delimiter
 * @apiParam {Number} [limit]   Optional Maximum number of records to return - defaults to 0(no limit)
 * @apiParam {Number} [skip]    Optional Record offset for pagination
 *
 * @apiHeader {String} authorization 
 *                              A valid JWT token "Bearer: xxxxx"
 * @apiSuccess {Object}         List of projects (maybe limited / skipped) and total count
 */
router.get('/', jwt({secret: config.express.pubkey}), (req, res, next)=>{
    var find = {};
    if(req.query.find) find = JSON.parse(req.query.find);

    //TODO I should only allow querying for projects that user has access?

    db.Projects.find(find)
    .select(req.query.select)
    .limit(req.query.limit || 0)
    .skip(req.query.skip || 0)
    .sort(req.query.sort || '_id')
    .lean()
    .exec((err, recs)=>{
        if(err) return next(err);
        db.Projects.count(find).exec((err, count)=>{
            if(err) return next(err);

            //adding some derivatives
            recs.forEach(function(rec) {
                rec._canedit = canedit(req.user, rec);
            });
            res.json({projects: recs, count: count});
        });
    });
});

/**
 * @apiGroup Project
 * @api {post} /project         Post Project
 * @apiDescription              Register new project
 *
 * @apiParam {String} access    "public" or "private"
 * @apiParam {String} [name]    User friendly name for this container 
 * @apiParam {String} [desc]    Description for this dataset 
 *
 * @apiParam {String[]} admins  Admin IDs
 * @apiParam {String[]} members Members
 *
 * @apiHeader {String} authorization 
 *                              A valid JWT token "Bearer: xxxxx"
 *
 * @apiSuccess {Object}         Project record registered
 */
router.post('/', jwt({secret: config.express.pubkey}), function(req, res, next) {
    req.body.user_id = req.user.sub;
    var project = new db.Projects(req.body);
    project.save(function(err) {
        if (err) return next(err); 
        project = JSON.parse(JSON.stringify(project));
        project._canedit = canedit(req.user, project);
        res.json(project);
    });
});

/**
 * @apiGroup Project
 * @api {put} /project/:id
 *                              Put Project
 * @apiDescription              Update project
 *
 * @apiParam {String} [access]  "public" or "private"
 * @apiParam {String} [name]    User friendly name for this container 
 * @apiParam {String} [desc]    Description for this dataset 
 *
 * @apiParam {String[]} [admins]  List of admins (auth sub)
 * @apiParam {String[]} [members] List of admins (auth sub)
 *
 * @apiHeader {String} authorization 
 *                              A valid JWT token "Bearer: xxxxx"
 *
 * @apiSuccess {Object}         Project object updated
 */
router.put('/:id', jwt({secret: config.express.pubkey}), (req, res, next)=>{
    var id = req.params.id;
    db.Projects.findById(id, (err, project)=>{
        if(err) return next(err);
        if(!project) return res.status(404).end();

        //check access
        //if(project.user_id != req.user.sub && !~project.admins.indexOf(req.user.sub)) {
        if(canedit(req.user, project)) {
            //only allow update to certain fields
            if(req.body.access) project.access = req.body.access;
            if(req.body.name) project.name = req.body.name;
            if(req.body.desc) project.desc = req.body.desc;
            if(req.body.admins) project.admins = req.body.admins;
            if(req.body.members) project.members = req.body.members;
            project.save((err)=>{
                if(err) return next(err);
                project = JSON.parse(JSON.stringify(project));
                project._canedit = canedit(req.user, project);
                res.json(project);
            });
        } else return res.status(401).end("you are not administartor of this project");
    });
});

/**
 * @apiGroup Project
 * @api {delete} /project/:id
 *                              Remove registered project (only by the user registered it)
 * @apiDescription              Physically remove a project registered on DB.
 *
 * @apiHeader {String} authorization 
 *                              A valid JWT token "Bearer: xxxxx"
 */
router.delete('/:id', jwt({secret: config.express.pubkey}), function(req, res, next) {
    var id = req.params.id;
    //TODO - prevent user from removing project that's in use..
    db.Projects.findById(req.params.id, function(err, project) {
        if(err) return next(err);
        if(!project) return next(new Error("can't find the project with id:"+req.params.id));
        //only superadmin or admin of this test spec can update
        if(canedit(req.user, project)) {
            project.remove().then(function() {
                res.json({status: "ok"});
            }); 
        } else return res.status(401).end();
    });
});

module.exports = router;


