import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList, GraphQLID } from "graphql";

interface User { id: string; name: string; email: string; }

const users: User[] = [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Alan Turing", email: "alan@example.com" }
];

const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) }
    }
});

const QueryType = new GraphQLObjectType({
    name: "Query",
    fields: {
        users: {
            type: new GraphQLList(UserType),
            resolve: () => users
        },
        user: {
            type: UserType,
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            resolve: (_, { id }) => users.find(u => u.id === id) ?? null
        }
    }
});

const MutationType = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        createUser: {
            type: UserType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                email: { type: new GraphQLNonNull(GraphQLString) }
            },
            resolve: (_, { name, email }) => {
                const user: User = { id: String(users.length + 1), name, email };
                users.push(user);
                return user;
            }
        }
    }
});

export const schema = new GraphQLSchema({ query: QueryType, mutation: MutationType });
