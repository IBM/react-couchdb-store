# store
PouchDB javascript api used in Rangefeed2 and Admin app

## Install

`$ yarn add https://github.com/IBM/react-couchdb-store.git`

## Usage
Create a database schema first. Then, integrate into your app:
```javascript
import Store from 'store';

const { store, storeUtil } = Store;

// Available methods for store:
store.init(host, port, dbName, username, password, useSSL, noLive, localPrefix); // noLive and localPrefix are optional
store.onChanged(callback);
store.create(item);
store.read(id);
store.update(item, force);
store.delete(item);

// Available methods for storeUtil:
storeUtil.init(newDbSchema);
storeUtil.createDefaultStates(states);
storeUtil.load(onStateChange);
storeUtil.registerEventListeners(onStateChange);
```
