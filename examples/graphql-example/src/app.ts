import Sprint from "sprint-es";
import { schema } from "./graphql/schema.js";

const app = new Sprint();
app.setGraphQLSchema(schema);
