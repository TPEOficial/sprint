import {
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