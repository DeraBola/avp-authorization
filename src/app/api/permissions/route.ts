import { NextRequest, NextResponse } from "next/server";
import {
  VerifiedPermissionsClient,
  BatchIsAuthorizedCommand,
} from "@aws-sdk/client-verifiedpermissions";
import jwt from "jsonwebtoken";
import { ACTIONS } from "@/lib/Permissions";
import { fromEnv } from "@aws-sdk/credential-provider-env";

const client = new VerifiedPermissionsClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export async function GET(req: NextRequest) {
  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    interface DecodedToken {
      sub?: string;
      email?: string;
      "cognito:groups"?: string | string[];
      [key: string]: any;
    }

    const rawDecoded = jwt.decode(token);

    if (!rawDecoded || typeof rawDecoded !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const decoded: DecodedToken = rawDecoded;

    console.log("Decoded token:", decoded);

    // Normalize Cognito groups
    let groups: string[] = [];
    if (decoded["cognito:groups"]) {
      if (Array.isArray(decoded["cognito:groups"])) {
        groups = decoded["cognito:groups"];
      } else if (typeof decoded["cognito:groups"] === "string") {
        groups = decoded["cognito:groups"].split(",");
      }
    }

    // 2. Build batch requests — only include User entity (with groups)
    const command = new BatchIsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      entities: {
        entityList: [
          {
            identifier: {
              entityType: "JobApp::User",
              entityId: decoded.sub!,
            },
            attributes: {
              sub: { string: decoded.sub! },
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
      requests: ACTIONS.map((actionId) => ({
        principal: {
          entityType: "JobApp::User",
          entityId: decoded.sub!,
        },
        action: {
          actionType: "JobApp::Action",
          actionId,
        },
        resource: {
          entityType: "JobApp::Candidate",
          entityId: "12",
        },
      })),
    });

    console.log(
      "COMMAND PERMISSIONINPUT:",
      JSON.stringify(command.input, null, 2)
    );

    // 3. Send to AVP
    const res = await client.send(command);

    console.log("AVP raw batch result:", JSON.stringify(res, null, 2));

    // 4. Filter for allowed actions
    const allowed = res.results
      ?.filter((r) => r.decision === "ALLOW")
      .map((r) => r.request?.action?.actionId);

    return NextResponse.json({ permissions: allowed ?? [] });
  } catch (err) {
    console.error("Error fetching permissions:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
