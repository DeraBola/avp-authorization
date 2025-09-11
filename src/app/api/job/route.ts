import { NextRequest, NextResponse } from "next/server";
import {
  VerifiedPermissionsClient,
  BatchGetPolicyCommandInput
  ,
} from "@aws-sdk/client-verifiedpermissions";
import jwt from "jsonwebtoken";

const client = new VerifiedPermissionsClient({
  region: process.env.AWS_REGION,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.decode(token) as {
      sub?: string;
      email?: string;
      "cognito:groups"?: string[] | string;
      [key: string]: any;
    };

    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Normalize groups from token
    let groups: string[] = [];
    if (decoded["cognito:groups"]) {
      if (Array.isArray(decoded["cognito:groups"])) {
        groups = decoded["cognito:groups"];
      } else if (typeof decoded["cognito:groups"] === "string") {
        groups = decoded["cognito:groups"].split(",");
      }
    }

    const BatchGetPolicyCommandInput = {
      policyStoreId: process.env.AVP_STORE_ID!,
      entityId: decoded.sub,
      entityType: "JobApp::User",
      definition: {
        attributes: {
          sub: { string: decoded.sub },
          email: { string: decoded.email ?? "" },
          groups: {
            set: groups.map((g) => ({
              entityIdentifier: { entityType: "JobApp::Role", entityId: g },
            })),
          },
        },
      },
    };

    console.log("Syncing user to AVP:", JSON.stringify(putEntityInput, null, 2));

    await client.send(new PutEntityCommand(putEntityInput));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to sync user to AVP:", error);
    return NextResponse.json(
      { error: "Failed to sync user to AVP", details: error.message },
      { status: 500 }
    );
  }
}
