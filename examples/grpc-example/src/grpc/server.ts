import * as grpc from "@grpc/grpc-js";
import { createGrpcServer } from "sprint-es/grpc";

interface HelloRequest { name: string; }
interface HelloReply { message: string; }

const greeterService: grpc.ServiceDefinition = {
    SayHello: {
        path: "/Greeter/SayHello",
        requestStream: false,
        responseStream: false,
        requestSerialize: (v: HelloRequest) => Buffer.from(JSON.stringify(v)),
        requestDeserialize: (b: Buffer) => JSON.parse(b.toString()) as HelloRequest,
        responseSerialize: (v: HelloReply) => Buffer.from(JSON.stringify(v)),
        responseDeserialize: (b: Buffer) => JSON.parse(b.toString()) as HelloReply
    }
};

export async function startGrpc() {
    return await createGrpcServer({
        address: process.env.GRPC_ADDRESS ?? "0.0.0.0:50051",
        services: [
            {
                service: greeterService,
                implementation: {
                    SayHello: (call: grpc.ServerUnaryCall<HelloRequest, HelloReply>, callback: grpc.sendUnaryData<HelloReply>) => {
                        callback(null, { message: `Hello, ${call.request.name}!` });
                    }
                }
            }
        ]
    });
}