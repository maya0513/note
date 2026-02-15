build:
    pnpm build

test:
    pnpm test

test-watch:
    pnpm test:watch

lint: build
    pnpm lint

lint-fix: build
    pnpm lint:fix
