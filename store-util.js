import store from "./store";

let dbSchema;
let bidirectional;

/**
 * Converts a database document into a state object
 * @param {string} docKey The document key/id
 * @param {object} dbSchemaDoc The document from the db schema
 * @param {object} valueObject The new value object from the database
 * @param {string} valueName Use "value" or "defaultValue"
 * @param {boolean} ignorePayload Set this to true if payload should be ignored
 */
function dbDocument2State(
  docKey,
  dbSchemaDoc,
  valueObject,
  valueName,
  ignorePayload
) {
  const newState = {};
  newState[docKey] =
    typeof dbSchemaDoc.postProcess === "function"
      ? dbSchemaDoc.postProcess(valueObject[valueName])
      : valueObject[valueName];
  if (dbSchemaDoc.payload && !ignorePayload) {
    Object.keys(dbSchemaDoc.payload).forEach(payloadKey => {
      // This will create a new state for each payload value in camel case
      // For example, customTweet + sentiment = customTweetSentiment
      const payloadStateKey = `${docKey}${payloadKey.charAt(0).toUpperCase() +
        payloadKey.slice(1)}`;
      newState[payloadStateKey] = valueObject[payloadKey];
    });
  }
  return newState;
}

export default {
  /**
   * Initialize storeUtil
   * @param {object} newDbSchema The database schema to use
   */
  init(newDbSchema) {
    dbSchema = newDbSchema;
  },

  /**
   * Initialize bidirectional value
   * @param {boolean} value Whether or not the local pouchdb will write to the remote CouchDB
   */
  setBidirectional(value) {
    bidirectional = value;
  },

  /**
   * Converts database schema to a state
   * @param {object} states The states object of a component
   */
  createDefaultStates(states) {
    const currentStates = states;
    Object.keys(dbSchema).forEach(docKey => {
      const dbSchemaDoc = dbSchema[docKey];
      const newState = dbDocument2State(
        docKey,
        dbSchemaDoc,
        dbSchemaDoc,
        "defaultValue",
        true
      );
      if (dbSchemaDoc.payload) {
        Object.keys(dbSchemaDoc.payload).forEach(payloadKey => {
          const payloadValue = dbSchemaDoc.payload[payloadKey];
          const camelCasePayloadKey = `${docKey}${payloadKey
            .charAt(0)
            .toUpperCase() + payloadKey.slice(1)}`;
          currentStates[camelCasePayloadKey] = payloadValue;
        });
      }
      currentStates[docKey] = newState[docKey];
    });
  },

  /**
   * Reads all data from database and triggers a state change
   * @param {function} onStateChange Usually this is this.state within a component
   */
  load(onStateChange) {
    // Read all values from database and set as states
    Object.keys(dbSchema).forEach(docKey => {
      const dbSchemaDoc = dbSchema[docKey];
      store
        .read(docKey)
        .then(res => {
          const newState = dbDocument2State(docKey, dbSchemaDoc, res, "value");
          onStateChange(newState);
        })
        .catch(err => {
          // Document doesn't exist in db yet, so create it
          if (err.status === 404) {
            const newDocument = {
              _id: docKey,
              value: dbSchemaDoc.defaultValue,
              quickUpdate: dbSchemaDoc.quickUpdate
            };
            if (dbSchemaDoc.payload) {
              Object.keys(dbSchemaDoc.payload).forEach(payloadKey => {
                newDocument[payloadKey] = dbSchemaDoc.payload[payloadKey];
              });
            }
            store.create(newDocument);
          }
        });
    });
  },

  /**
   * Registers event listeners to get notified when database values change
   * @param {function} onStateChange Usually this is this.state within a component
   */
  registerEventListeners(onStateChange) {
    store.onChanged(res => {
      if (res && res.direction === "pull" && res.change && res.change.docs) {
        let { docs } = res.change;
        for (let i = 0; i < docs.length; i += 1) {
          const doc = docs[i];
          /* eslint-disable no-loop-func */
          Object.keys(dbSchema).forEach(docKey => {
            const dbSchemaDoc = dbSchema[docKey];
            if (doc._id === docKey) {
              const newState = dbDocument2State(
                docKey,
                dbSchemaDoc,
                doc,
                "value"
              );
              onStateChange(newState, doc.quickUpdate === true);
            }
          });
          /* eslint-disable no-loop-func */
        }
      } else if (res && res.docs && !bidirectional) {
        let { docs } = res;
        for (let i = 0; i < docs.length; i += 1) {
          const doc = docs[i];
          /* eslint-disable no-loop-func */
          Object.keys(dbSchema).forEach(docKey => {
            const dbSchemaDoc = dbSchema[docKey];
            if (doc._id === docKey) {
              const newState = dbDocument2State(
                docKey,
                dbSchemaDoc,
                doc,
                "value"
              );
              onStateChange(newState, doc.quickUpdate === true);
            }
          });
        }
      }
    });
  }
};
