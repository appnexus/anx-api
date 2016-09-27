# Upgrading from 3.x to 4.x

## requestJson, getJson, getAllJson, postJson, putJson, and deleteJson methods removed

These methods have been fully replaced with there non `Json` suffixed versions. The new methods set Accept and or Content-Type to `application/json` by default. To use a custom Accept or Content-Type use either the `mimeType` or `headers` options in the request.
