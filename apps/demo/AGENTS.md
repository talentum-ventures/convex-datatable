# Demo App Context

## Purpose
Demonstrate the DataTable package with realistic configuration and interactions.

## Rules
- Keep demo rows and data source deterministic.
- Keep all supported column kinds represented.
- Exercise key feature flags in demo usage (`editing`, `rowAdd`, `rowDelete`, `clipboardPaste`).

## Build/Test
- Dev: `bun --filter @rolha/demo dev`
- Typecheck: `bun --filter @rolha/demo typecheck`
- Build: `bun --filter @rolha/demo build`
