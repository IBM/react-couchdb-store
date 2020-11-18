/**
  Copyright 2020- IBM Inc. All rights reserved
  SPDX-License-Identifier: Apache2.0
 */

import PouchDB from "pouchdb-browser";
import storeUtil from "./store-util";

let db;
const callbacks = {
  changed: []
};

export default {
  /**
   * Call this on startup to connect to database
   * @param {string} host The host path, e.g. localhost, 127.0.0.1, foo.bar.com
   * @param {number} port The port number
   * @param {string} dbName The name of the database
   * @param {string} user The username
   * @param {string} pwd The password
   * @param {string} ssl Set to true if https should used instead of http
   * @param {boolean} noLive (Optional) Set to true if no live option should be used
   * @param {boolean} localPrefix (Optional) Set this if you want PouchDB to use a prefixed name in browser
   * @param {boolean} biderectional (Optional) Set this to false if you want PouchDB to only read from the remote CouuchDB
   */
  init(
    host,
    port,
    dbName,
    user,
    pwd,
    ssl,
    noLive = false,
    localPrefix = "",
    biderectional = true
  ) {
    const localDBName = `${localPrefix}${dbName}`;
    db = new PouchDB(localDBName);
    const protocol = ssl === true ? "https" : "http";
    const remoteCouch = `${protocol}://${user}:${pwd}@${host}:${port}/${dbName}`;
    storeUtil.setBidirectional(biderectional);

    if (biderectional) {
      return PouchDB.sync(localDBName, remoteCouch, {
        live: noLive == true ? false : true,
        retry: true
      }).on("change", info => {
        for (let i = 0; i < callbacks.changed.length; i += 1) {
          callbacks.changed[i](info);
        }
        console.info(
          "store.js: Event callback! Database value has changed to:",
          info
        );
      });
    } else {
      return PouchDB.replicate(remoteCouch, localDBName, {
        live: noLive == true ? false : true,
        retry: true
      }).on("change", info => {
        for (let i = 0; i < callbacks.changed.length; i += 1) {
          callbacks.changed[i](info);
        }
        console.info(
          "store.js: Event callback! Database value has changed to:",
          info
        );
      });
    }
  },

  /**
   * Closes the connection
   */
  close() {
    if (db) db.close();
  },

  /**
   * Register a new event listener for when data has changed
   * @param {function} callback Your event listener
   */
  onChanged(callback) {
    if (callback) callbacks.changed.push(callback);
  },

  /**
   * Creates a new document in the database
   * @param {object} item The document to add to database
   */
  create(item) {
    return db.post(item);
  },

  /**
   * Reads new data from the database
   * @param {string} id (optional) The id of the document to read.
   *                    Will read all docs if no id is provided.
   */
  read(id) {
    if (!id) return db.allDocs({ include_docs: true });
    return db.get(id);
  },

  /**
   * Updates the given document. WARNING: Can cause revision conflicts
   * @param {object} item The document to update
   * @param {boolean} force Set to true to overwrite conflicts
   */
  update(item, force) {
    if (force === true) {
      return db.get(item._id).then(res => {
        const newObject = res;
        Object.keys(item).forEach(itemKey => {
          if (itemKey !== "_id" && itemKey !== "_rev") {
            newObject[itemKey] = item[itemKey];
          }
        });
        return db.put(newObject);
      });
    }
    return db.put(item);
  },

  /**
   * Will delete the given document from database
   * @param {object} item The document to delete
   */
  delete(item) {
    return db.remove(item);
  }
};
