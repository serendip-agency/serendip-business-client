"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sUtil = require("serendip-utility");
/**
 *  Will contain everything that we need from client
 */
class Client {
    // passing worker from Start.js
    constructor(opts, callback) {
        Client.opts = opts;
        if (!opts.services)
            opts.services = [];
        this.addServices(opts.services)
            .then(() => callback())
            .catch(e => callback(e));
    }
    // FIXME: needs refactor
    addServices(serviceClasses) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!serviceClasses)
                return;
            if (serviceClasses.length == 0)
                return;
            let serviceObjects = {};
            let unsortedDependencies = [];
            serviceClasses.forEach(sv => {
                if (!sv)
                    return;
                if (typeof sv.dependencies !== "undefined" && sv.dependencies.length)
                    sv.dependencies.forEach((dep) => {
                        dep = sUtil.text.capitalizeFirstLetter(dep);
                        if (unsortedDependencies.indexOf([sv.name, dep]) === -1)
                            unsortedDependencies.push([sv.name, dep]);
                    });
                sUtil.functions.args(sv).forEach((dep) => {
                    dep = sUtil.text.capitalizeFirstLetter(dep);
                    if (unsortedDependencies.indexOf([sv.name, dep]) === -1)
                        unsortedDependencies.push([sv.name, dep]);
                });
                serviceObjects[sv.name] = sv;
            });
            // TODO: replace toposort module with code :)
            var sortedDependencies = sUtil.arrays.toposort(unsortedDependencies).reverse();
            // if there is only one service topoSort will return empty array so we should push that one service ourselves
            if (sortedDependencies.length == 0) {
                if (serviceClasses[0])
                    sortedDependencies.push(serviceClasses[0].name);
            }
            if (Client.opts.logging == "info")
                console.log(`Starting Client services...`);
            if (serviceClasses.length > 0)
                yield this.startService(0, serviceObjects, sortedDependencies, unsortedDependencies);
        });
    }
    /**
     * Will start services from Index to length of sortedDependencies
     * @param index Index of item in sortedDependencies to start
     * @param serviceObjects key value object that contains service objects and their names
     * @param sortedDependencies Service names sorted by dependency order
     */
    startService(index, serviceObjects, sortedDependencies, unsortedDependencies) {
        return __awaiter(this, void 0, void 0, function* () {
            const serviceName = sortedDependencies[index];
            let serviceDependencies = unsortedDependencies.filter(p => p[0] === serviceName).map(p => p[1]) ||
                [];
            if (serviceDependencies.length > 0) {
                serviceDependencies = serviceDependencies.reduceRight((prev, current, currentIndex, array) => {
                    if (typeof prev == "string")
                        return [prev];
                    if (prev.indexOf(current) == -1)
                        return prev.concat([current]);
                    return prev;
                });
            }
            if (typeof serviceDependencies == "string")
                serviceDependencies = [serviceDependencies];
            if (!serviceName)
                return;
            var serviceObject;
            if (!serviceObjects[serviceName])
                throw `${serviceName} not imported as service in start method. it's a dependency of ` +
                    unsortedDependencies
                        .filter(p => p[1] == serviceName)
                        .map(p => p[0])
                        .join(",");
            try {
                serviceObject = new serviceObjects[serviceName](...unsortedDependencies
                    .filter(p => p[0] === serviceName)
                    .map(p => Client.services[p[1]]));
            }
            catch (e) {
                throw `Client Service Error in "${serviceName}"\n\t` + e.message;
            }
            Client.services[serviceName] = serviceObject;
            if (!serviceObject.start)
                return this.startService(index + 1, serviceObjects, sortedDependencies, unsortedDependencies);
            else {
                if (Client.opts.logging == "info")
                    console.log(`${(index + 1).toString().padStart(2, " ")} of ${Object.keys(serviceObjects)
                        .length.toString()
                        .padStart(2, "")} starting ${serviceName} it depends on: ${serviceDependencies.join(",") || "none"}`);
                yield serviceObject.start();
                if (Client.opts.logging == "info")
                    console.log(`${(index + 1).toString().padStart(2, " ")} of ${Object.keys(serviceObjects)
                        .length.toString()
                        .padStart(2, " ")} ☑ ${serviceName}`);
                if (sortedDependencies.length > index + 1)
                    return this.startService(index + 1, serviceObjects, sortedDependencies, unsortedDependencies);
                return;
            }
        });
    }
}
Client.services = {};
exports.Client = Client;
