import Sprint from "sprint-es";
import { graphqlSchema } from "./graphql/schema";

const app = new Sprint();
app.setGraphQLSchema(graphqlSchema);