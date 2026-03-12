# API Skills — Hono.js + tRPC + Better Auth

## Architecture
```
HTTP Request -> Hono middleware pipeline -> createContext(c) -> tRPC procedures -> Service layer
```
Hono = HTTP boundary. tRPC = business logic boundary. Bridge = createContext().

## Core Rules (Always Apply)
- Hono extracts session, tRPC enforces auth — never reject unauthed users at Hono layer
- One auth.api.getSession() call per request (in Hono sessionMiddleware)
- SuperJSON must match on server and client — mismatched = silent data corruption
- errorFormatter is the single place that shapes all tRPC error responses
- errorMapperMiddleware maps domain errors to TRPCError — not individual procedures
- tRPC errors do NOT bubble to app.onError() — Hono only catches non-tRPC errors
- Always use .output(schema) for output validation
- Procedures call service functions — never import db or tx directly

## File Map
```
src/
  app.ts                      -- Hono entry, middleware pipeline
  instrument.ts               -- Sentry init (first import)
  types.ts                    -- AppEnv
  middleware/
    security.ts               -- CORS, secureHeaders
    logger.ts                 -- Request-scoped logger
    session.ts                -- Better Auth session extraction
    sentry.ts                 -- Sentry user binding
  trpc/
    init.ts                   -- initTRPC, SuperJSON, errorFormatter
    context.ts                -- createContext bridge
    procedures.ts             -- Procedure bases
    router.ts                 -- appRouter
    middleware/
      auth.ts                 -- isAuthenticated, isAdmin, hasRole
      logger.ts               -- Procedure logging
      errorMapper.ts          -- Domain -> TRPCError
  routers/                    -- One file per domain
```

## Skill Routing
| When working on... | Load this skill |
|---|---|
| Hono middleware, CORS, security, session extraction, app.onError, health endpoints | hono-middleware.md |
| initTRPC, SuperJSON config, errorFormatter, createContext bridge | trpc-init.md |
| Auth enforcement middleware, role checks, procedure bases | trpc-auth.md |
| Error handling patterns, errorMapperMiddleware, TRPCError codes, onError hook | trpc-errors.md |
| Router structure, input/output validation, type export, batching, client setup | trpc-routers.md |
| Sentry at both layers, structured logging, request tracing | observability.md |

## Middleware Order
```
secureHeaders -> cors -> auth.handler -> requestLogger -> sessionMiddleware -> sentryUserContext -> trpcServer -> healthz -> app.onError -> app.notFound
```

## Error Flow (Quick Reference)
```
Domain Error (db-agent) -> errorMapperMiddleware -> TRPCError -> errorFormatter -> onError -> Client JSON
Hono HTTP Error         -> app.onError() -> HTTP Response
```
