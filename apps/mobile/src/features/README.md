# features

Global reusable features (cross-page) live here as FSD slices, each with a
public-API `index.ts` and `ui/` + `model/` segments. Page-local functionality
uses the fractal pattern (`pages/*/features/`).

This slice is empty for the scaffold shell - the placeholder screens need no
shared features yet. The first occupants will likely be transaction add/edit and
account/category create flows as they're extracted from their pages.
