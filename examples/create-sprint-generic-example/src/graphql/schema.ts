import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { queries, mutations } from "./resolvers";

const Query = new GraphQLObjectType({
    name: "Query",
    fields: queries
});

const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: mutations
});

export const graphqlSchema = new GraphQLSchema({ query: Query, mutation: Mutation });