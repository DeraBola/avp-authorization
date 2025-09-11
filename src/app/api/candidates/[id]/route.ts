// app/api/candidates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
  ContextDefinition,
} from "@aws-sdk/client-verifiedpermissions";
import { fromEnv } from "@aws-sdk/credential-provider-env";

console.log("ALL ENV:", process.env);

const client = new VerifiedPermissionsClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    console.log("params:", id);
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ Decode JWT to get the user ID (sub)
    interface DecodedToken {
      sub?: string;
      email?: string;
      "cognito:groups"?: string | string[];
      [key: string]: any;
    }

    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    console.log("decoded token:", decoded);

    const userId = decoded.sub;
      // Normalize groups from token
    let groups: string[] = [];
    if (decoded["cognito:groups"]) {
      if (Array.isArray(decoded["cognito:groups"])) {
        groups = decoded["cognito:groups"];
      } else if (typeof decoded["cognito:groups"] === "string") {
        groups = decoded["cognito:groups"].split(",");
      }
    }


    // Build AVP authorization command with token in context
    const command = new IsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      principal: {
        entityType: "JobApp::User",
        entityId: userId,
      },
      action: {
        actionType: "JobApp::Action",
        actionId: "DeleteCandidate", // Just the action name
      },
      resource: {
        entityType: "JobApp::Candidate",
        entityId: String(id),
      },
      entities: {
        entityList: [
          {
            identifier: {
              entityType: "JobApp::User",
              entityId: decoded.sub,
            },
            attributes: {
              sub: { string: decoded.sub },
              email: { string: decoded.email ?? "" },
              groups: {
                set: groups.map((g) => ({
                  entityIdentifier: {
                    entityType: "JobApp::Role",
                    entityId: g,
                  },
                })),
              },
            },
          },
        ],
      },
    });

    console.log("COMMAND INPUT:", JSON.stringify(command.input, null, 2));

    const result = await client.send(command);

    console.log("AVP raw result:", JSON.stringify(result, null, 2));

    // Forbidden if AVP denies
    if (result.decision !== "ALLOW") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // e.g., await prisma.candidate.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Candidate ${id} deleted by user ${userId}`,
    });
  } catch (err: any) {
    console.error("AVP error name:", err.name);
    console.error("AVP error message:", err.message);
    console.error("AVP error stack:", err.stack);

    console.error(
      "AVP error full:",
      JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
    );

    return NextResponse.json(
      {
        error:
          typeof err === "object" && err !== null && "message" in err
            ? (err as { message?: string }).message
            : "Authorization check failed",
        details: JSON.stringify(err, null, 2),
      },
      { status: 500 }
    );
  }
}
