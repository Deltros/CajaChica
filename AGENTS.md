<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Software architecture and quality standards

This is a financial application — correctness and reliability are non-negotiable. Always program as a good software architect:

- **Never use user-visible strings (descriptions, labels, names) as business logic identifiers.** If the system needs to classify a record internally, use a dedicated enum field in the schema — never match against a `description` or `label` string that the user can freely edit.
- **Single Responsibility Principle:** Each field should serve one purpose. A `description` field is for display; a `source` or `type` field is for classification. Never conflate the two.
- **Open/Closed Principle:** Adding a new kind of adjustment or entry type should extend the enum, not require changing string constants across the codebase.
- **No magic strings or magic numbers** in business logic. Any constant that drives behavior belongs in an enum, a named constant, or a schema-level constraint.
- **Separation of concerns:** Presentation logic (what the user sees) must be decoupled from domain logic (what the system does with data). A name change in the UI must never break a calculation.
- These principles apply to all models, APIs, and frontend logic. When in doubt, prefer an explicit enum over an implicit convention.
<!-- END:nextjs-agent-rules -->
