import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
} from "@aws-sdk/client-verifiedpermissions";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const client = new VerifiedPermissionsClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export async function POST(req: NextRequest) {
  try {
    const { action, candidateId } = await req.json();

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    interface DecodedToken {
      sub?: string;
      email?: string;
      "cognito:groups"?: string | string[];
      "custom:department"?: string;
      "custom:status"?: string;
      "custom:location"?: string;
      "custom:time"?: string;
      [key: string]: any;
    }

    const decoded = jwt.decode(token) as DecodedToken;
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("Decoded token:", decoded);

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

    // ISO string for context
    const now = new Date().toISOString();

    // Build AVP authorization command
    const command = new IsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      principal: {
        entityType: "JobApp::User",
        entityId: userId,
      },
      action: {
        actionType: "JobApp::Action",
        actionId: action || "ReadCandidate",
      },
      resource: {
        entityType: "JobApp::Candidate",
        entityId: candidateId || "candidate-123",
      },
      entities: {
        entityList: [
          {
            identifier: {
              entityType: "JobApp::User",
              entityId: userId,
            },
            attributes: {
              sub: { string: decoded.sub },
              email: { string: decoded.email ?? "" },
              department: { string: decoded["custom:department"] ?? "" },
              location: { string: decoded["custom:Location"] ?? "" },
              status: { string: decoded["custom:Status"] ?? "" },
              time: { string: decoded["custom:Time"] ?? "" },
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
      }
    });

    console.log("AUTHORIZE COMMAND INPUT:", JSON.stringify(command.input, null, 2));

    const result = await client.send(command);

    console.log("AVP AUTHORIZE raw result:", JSON.stringify(result, null, 2));

    if (result.decision !== "ALLOW") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: `User ${userId} authorized for ${action}`,
      decision: result.decision,
    });
  } catch (err: any) {
    console.error("AVP error name:", err.name);
    console.error("AVP error message:", err.message);
    console.error("AVP error stack:", err.stack);

    return NextResponse.json(
      {
        error:
          typeof err === "object" && err !== null && "message" in err
            ? (err as { message?: string }).message
            : "Authorization check failed",
      },
      { status: 500 }
    );
  }
}
