# TypeScript Definition Tests

This folder contains TypeScript type tests using [tsd](https://github.com/tsdjs/tsd).

## Running Tests

```bash
npm test
```

Or directly:

```bash
npx tsd
```

## Test File

- `index.test-d.ts` - Main type definition tests using tsd

## Writing Tests

Use tsd's assertion functions:

```typescript
import { expectType, expectError } from 'tsd';
import OpenSeadragon from '..';

const viewer = OpenSeadragon({ id: "viewer" });
expectType<OpenSeadragon.Viewer>(viewer);

expectError(OpenSeadragon({ id: 123 }));
```
