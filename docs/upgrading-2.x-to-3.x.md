# Upgrading from 2.x to 3.x

## getJson, putJson, postJson, deleteJson deprecated

`getJson`, `putJson`, `postJson`, and `deleteJson` are now deprecated and `get`, `put`, `post`, and `delete` can be used instead. These methods now set Accept and or Content-Type to `application/json` by default. To use a custom Accept or Content-Type use either the `mimeType` or `headers` options in the request:

*mimeType*
```javascript
api.get('users.csv', { mimeType: 'text/csv' })
```

*headers*
```javascript
api.get('users.csv', {
	headers: { Accept: 'text/csv', 'Content-Type': 'text/csv' }
})
```
