export function getGraphQLFiles(language: string) {
    const isTs = language === "typescript";
    
    const tsTypes = `import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull } from "graphql";

export const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        email: { type: GraphQLString }
    }
});
`;

    const jsTypes = `import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull } from "graphql";

export const UserType = new GraphQLObjectType({
    name: "User",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: GraphQLString },
        email: { type: GraphQLString }
    }
});
`;

    const tsResolvers = `import {
    GraphQLString,
    GraphQLList,
    GraphQLNonNull
} from "graphql";
import { UserType } from "./types";

interface User {
    id: string;
    name: string;
    email: string;
}

interface UserArgs {
    id: string;
}

interface CreateUserArgs {
    name: string;
    email: string;
}

export const users: User[] = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" }
];

export const queries = {
    hello: {
        type: GraphQLString,
        resolve: (): string => "Hello, GraphQL!"
    },
    users: {
        type: new GraphQLList(UserType),
        resolve: (): User[] => users
    },
    user: {
        type: UserType,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: (_: unknown, args: UserArgs): User | undefined => {
            return users.find(u => u.id === args.id);
        }
    }
};

export const mutations = {
    createUser: {
        type: UserType,
        args: {
            name: { type: new GraphQLNonNull(GraphQLString) },
            email: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: (_: unknown, args: CreateUserArgs): User => {
            const newUser: User = {
                id: String(users.length + 1),
                name: args.name,
                email: args.email
            };
            users.push(newUser);
            return newUser;
        }
    }
};
`;

    const jsResolvers = `import { GraphQLString, GraphQLList, GraphQLNonNull } from "graphql";
import { UserType } from "./types.js";

export const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" }
];

export const queries = {
    hello: {
        type: GraphQLString,
        resolve: () => "Hello, GraphQL!"
    },
    users: {
        type: new GraphQLList(UserType),
        resolve: () => users
    },
    user: {
        type: UserType,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: (_, args) => users.find(u => u.id === args.id)
    }
};

export const mutations = {
    createUser: {
        type: UserType,
        args: {
            name: { type: new GraphQLNonNull(GraphQLString) },
            email: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: (_, args) => {
            const newUser = { id: String(users.length + 1), name: args.name, email: args.email };
            users.push(newUser);
            return newUser;
        }
    }
};
`;

    const tsSchema = `import { GraphQLSchema, GraphQLObjectType } from "graphql";
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
`;

    const jsSchema = `import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { queries, mutations } from "./resolvers.js";

const Query = new GraphQLObjectType({
    name: "Query",
    fields: queries
});

const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: mutations
});

export const graphqlSchema = new GraphQLSchema({ query: Query, mutation: Mutation });
`;

    return {
        "types.ts": isTs ? tsTypes : jsTypes,
        "resolvers.ts": isTs ? tsResolvers : jsResolvers,
        "schema.ts": isTs ? tsSchema : jsSchema
    };
}
