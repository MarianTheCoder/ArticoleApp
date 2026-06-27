# Agent Rules

## Component Structure / JSX

- Do not create tiny wrapper components for JSX used only once or twice.
- If a UI fragment is simple, write it directly inline in the JSX where it is used.
- Only extract a component when it is reused in several places, contains meaningful state/effects, has non-trivial branching, or would make the parent clearly easier to read.
- Do not create components like `LocationBadge`, `PersonPreview`, `SmallPersonPreview`, `FieldChip`, etc. just to wrap a few Tailwind classes and one tooltip/image.
- Prefer local constants for repeated labels/classes over new components when the JSX is light.
- Before extracting a component, ask: “Does this remove real complexity or just hide simple markup?” If it only hides simple markup, keep it inline.

## General

- NEVER EVER IN THE NAME OF GOD, USE SMALLER THAN TEXT-XS. ALSO TEXT-XS IS PRETTY SMALL. TEXT-SM MINIM IS RECOMANNDED.
- ALL LITTLE preview images from every part in the code, regardless if it is avatar or img or whatver will use ImagePreviewTooltip component to show photo if hovering.
- Preserve existing workflow unless the user explicitly asks to change it.
- Keep changes scoped to the requested feature or bug.
- Do not refactor unrelated files.
- Do not revert user changes.
- Prefer existing project patterns over new abstractions.
- Split large components into smaller focused components.
- Do not put large row/dialog/table logic directly inside page components.
- Before editing, inspect the existing implementation and follow its structure.
- Use `apply_patch` for manual file edits.
- Run build or relevant checks after code changes when possible.
- If behavior is ambiguous, ASK before doing the changes.
- Never define large row components inside page JSX files. Extract them into separate files immediately.
- Never remove existing functionality unless explicitly requested.
- Ask a lot when you have misinformations or ambiguos task.

## Frontend

- Keep table pages focused on state, fetching, and layout.
- Put table rows, variant rows, dialogs, filters, and headers in separate components.
- Reuse existing shared components: `OverflowTooltip`, `ImagePreviewTooltip`, shadcn UI, existing dialogs, existing filters.
- Keep UI behavior consistent between similar screens.
- Do not duplicate table logic if an existing component pattern already exists.
- Preserve localStorage/cache behavior for column widths, visible columns, decimals, alignment, and view modes.
- Table selection must not be lost across pagination/filter/view changes unless explicitly cleared.
- Keep row selection, context menus, and hover states consistent with existing tables.
- Do not add marketing/empty decorative UI; use practical app UI.
- Headers should stay aligned and readable; numeric/money columns usually align right in rows and centered in headers.
- For inventory/catalog/offer tables, prefer compact rows and extracted row components.
- Do not add hidden side effects when opening dialogs.
- Dialog save actions should not close automatically unless the existing flow does that or the user asks.
- Do not change global styling for a local UI request.

## Backend

- Keep controllers scoped and avoid adding routes/endpoints that are not needed.
- Preserve current API response shapes unless the frontend change requires an extension.
- Reuse existing DB helpers and transaction patterns.
- Do not duplicate catalog data into inventory or offers unless explicitly required.
- Catalog remains the source of truth for resource definitions, variants, codes, classes, names, descriptions, costs, brand/supplier metadata.
- Inventory should store links/references and stock data, not copied catalog definitions.
- Use transactions for multi-step writes.
- Keep transactions short; avoid file/photo work inside DB transactions where possible.
- Validate IDs and required fields before DB writes.
- For list endpoints, keep pagination, search, sort, and filters consistent with existing controllers.
- Use parameterized queries.
- Do not change schema or migrations unless explicitly requested.
- If schema changes are needed, provide manual SQL when requested.
- Avoid automatic status updates unless explicitly requested by the flow.

## Database / Data Rules

- Do not duplicate catalog resources into inventory.
- Inventory resources reference catalog definitions.
- Inventory stock references catalog definitions and variants.
- Variants belong to catalog definitions.
- For materials, stock can be tracked by site.
- For utilaje/transport, assignment can be tracked by user/person.
- `NULL` location/user generally means default/available stock when that is the established rule.
- Keep RO/FR behavior consistent; language filtering must respect current inventory/catalog language.
- Brand/supplier metadata should be ID-based, not hardcoded text, when the meta tables exist.

## Offers / Ofertare

- Do not break `OferteReteteList`; it is the main working table.
- New offer views like `Extrase` should be separate components, not modifications inside the main list.
- Offer calculations must match between UI list and PDF.
- Cost, coefficient, price, TVA, recap, discount, and total calculations should use the same logic wherever possible.
- If something is excluded by coefficients, show it visually as inactive and do not add it to price.
- PDF should mirror the visible offer table logic and column naming.
- Avoid adding extra summary cards in PDFs unless requested.