import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull } from "graphql";

export const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        email: { type: GraphQLString }
    }
});