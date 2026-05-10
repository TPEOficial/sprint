# Sprint GraphQL Example

Minimal GraphQL API on Sprint.

```bash
npm install
npm run dev
```

- GraphQL endpoint: `POST http://localhost:5000/graphql`
- GraphiQL playground: `http://localhost:5000/graphiql` (dev only)

## Try it

```graphql
query {
    users { id name email }
}

mutation {
    createUser(name: "Linus", email: "linus@example.com") { id }
}
```
